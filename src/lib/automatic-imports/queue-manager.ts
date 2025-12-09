/**
 * Queue Manager for Automatic Imports
 * Handles queuing transactions, deduplication, and batch management
 */

import { getAuthenticatedUser } from '../supabase-queries';
import { getActiveAccountId } from '../account-context';
import type { ParsedTransaction } from '../import-types';
import { generateTransactionHash } from '../csv-parser';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get or create a single shared manual import setup for the current account
 * This is used for manual file uploads - we use one shared setup per account
 * to avoid creating thousands of setup records
 */
export async function getOrCreateManualImportSetup(
  accountId?: number,
  targetAccountId?: number | null,
  targetCreditCardId?: number | null
): Promise<number> {
  const { supabase, user } = await getAuthenticatedUser();
  const activeAccountId = accountId || await getActiveAccountId();
  if (!activeAccountId) throw new Error('No active account');

  // Use a single shared manual import setup per account (ignore target_account_id/credit_card_id)
  // This prevents creating thousands of setup records for manual uploads
  const { data: existingSetup } = await supabase
    .from('automatic_import_setups')
    .select('id')
    .eq('account_id', activeAccountId)
    .eq('source_type', 'manual')
    .single();

  if (existingSetup) {
    return existingSetup.id;
  }

  // Create new shared manual import setup
  const { data: newSetup, error } = await supabase
    .from('automatic_import_setups')
    .insert({
      account_id: activeAccountId,
      user_id: user.id,
      source_type: 'manual',
      source_identifier: `manual-${activeAccountId}`,
      target_account_id: null, // Not used for shared setup
      target_credit_card_id: null, // Not used for shared setup
      integration_name: 'Manual Upload',
      is_active: true,
      is_historical: false,
      source_config: {},
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating manual import setup:', error);
    throw error;
  }

  return newSetup.id;
}

/**
 * Clean up manual import setups that have no active queued imports
 * This should be called after batches are imported or deleted
 */
export async function cleanupManualImportSetups(accountId?: number): Promise<void> {
  const { supabase } = await getAuthenticatedUser();
  const activeAccountId = accountId || await getActiveAccountId();
  if (!activeAccountId) return;

  // Find all manual import setups for this account
  const { data: manualSetups } = await supabase
    .from('automatic_import_setups')
    .select('id')
    .eq('account_id', activeAccountId)
    .eq('source_type', 'manual');

  if (!manualSetups || manualSetups.length === 0) return;

  const setupIds = manualSetups.map(s => s.id);

  // Check which setups have active queued imports (pending or reviewing)
  const { data: activeQueuedImports } = await supabase
    .from('queued_imports')
    .select('import_setup_id')
    .eq('account_id', activeAccountId)
    .in('import_setup_id', setupIds)
    .in('status', ['pending', 'reviewing']);

  // Find setups with no active queued imports
  const activeSetupIds = new Set(activeQueuedImports?.map(qi => qi.import_setup_id) || []);
  const orphanedSetupIds = setupIds.filter(id => !activeSetupIds.has(id));

  // Delete orphaned manual setups
  if (orphanedSetupIds.length > 0) {
    // Keep one setup if we're deleting all (to avoid recreating on next upload)
    // Delete all but the oldest one
    if (orphanedSetupIds.length > 1) {
      const { data: setupsToKeep } = await supabase
        .from('automatic_import_setups')
        .select('id')
        .in('id', orphanedSetupIds)
        .order('created_at', { ascending: true })
        .limit(1);

      const keepId = setupsToKeep?.[0]?.id;
      const deleteIds = orphanedSetupIds.filter(id => id !== keepId);

      if (deleteIds.length > 0) {
        await supabase
          .from('automatic_import_setups')
          .delete()
          .in('id', deleteIds);
      }
    }
  }
}

export interface QueueTransactionOptions {
  importSetupId: number;
  transactions: ParsedTransaction[];
  sourceBatchId: string;
  isHistorical?: boolean;
  accountId?: number; // Optional: provide accountId for webhook contexts
  supabase?: SupabaseClient; // Optional: provide supabase client for webhook contexts
  csvData?: string[][]; // Optional: Raw CSV data for re-mapping
  csvAnalysis?: any; // Optional: CSV analysis result (CSVAnalysisResult)
  csvFingerprint?: string; // Optional: CSV fingerprint for template matching
  csvMappingTemplateId?: number; // Optional: Associated template ID
  csvFileName?: string; // Optional: Original CSV filename
  csvMappingName?: string; // Optional: Human-readable mapping name (template name or auto-generated)
}

/**
 * Queue transactions for review
 * Handles deduplication against both imported_transactions and queued_imports
 */
export async function queueTransactions(options: QueueTransactionOptions): Promise<number> {
  // Use provided supabase client or get authenticated user's client
  const supabase = options.supabase || (await getAuthenticatedUser()).supabase;
  // Use provided accountId or get from context
  const accountId = options.accountId || await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  const { 
    importSetupId, 
    transactions, 
    sourceBatchId, 
    isHistorical = false,
    csvData,
    csvAnalysis,
    csvFingerprint,
    csvMappingTemplateId,
    csvFileName,
    csvMappingName,
  } = options;

  // Get existing hashes to check for duplicates
  const hashes = transactions.map(t => t.hash);
  
  // First, deduplicate within the current batch (same hash appearing multiple times in transactions array)
  const seenInBatch = new Set<string>();
  const deduplicatedTransactions = transactions.filter(t => {
    if (seenInBatch.has(t.hash)) {
      return false; // Duplicate within this batch
    }
    seenInBatch.add(t.hash);
    return true;
  });

  // Check against imported_transactions
  const { data: existingImported } = await supabase
    .from('imported_transactions')
    .select('hash')
    .eq('account_id', accountId)
    .in('hash', Array.from(seenInBatch));

  // Check against queued_imports (get all statuses to check transaction_type)
  const { data: existingQueued } = await supabase
    .from('queued_imports')
    .select('hash, source_batch_id, status, transaction_type')
    .eq('account_id', accountId)
    .in('hash', Array.from(seenInBatch));

  // Build a map of hash -> { status, transaction_type } for queued imports
  const queuedHashInfo = new Map<string, { status: string; transaction_type: string }>();
  existingQueued?.forEach(t => {
    queuedHashInfo.set(t.hash, { status: t.status, transaction_type: t.transaction_type });
  });

  // Build set of existing hashes (from imported or queued)
  // Exclude hashes where:
  // 1. Status is 'rejected' (allow re-importing rejected transactions)
  // 2. Transaction_type differs (allow re-importing with correct type after convention fix)
  const existingHashes = new Set<string>();
  
  // Add imported transaction hashes (can't check transaction_type here, so treat as duplicates)
  existingImported?.forEach(t => {
    existingHashes.add(t.hash);
  });
  
  // Add queued import hashes, but exclude rejected or different transaction_type
  deduplicatedTransactions.forEach(t => {
    const queuedInfo = queuedHashInfo.get(t.hash);
    if (queuedInfo) {
      // Allow re-import if rejected or transaction_type differs
      const isRejected = queuedInfo.status === 'rejected';
      const typeDiffers = queuedInfo.transaction_type !== t.transaction_type;
      
      // Only mark as duplicate if not rejected AND transaction_type matches
      if (!isRejected && !typeDiffers) {
        existingHashes.add(t.hash);
      }
    }
  });

  // Filter out duplicates (both within batch and across batches)
  // For manual imports (sourceBatchId starts with "manual-"), allow duplicates to be queued for review
  const isManualImport = sourceBatchId.startsWith('manual-');
  const newTransactions = isManualImport 
    ? deduplicatedTransactions // Allow all transactions for manual imports (user can review duplicates)
    : deduplicatedTransactions.filter(t => !existingHashes.has(t.hash)); // Filter duplicates for automatic imports

  if (newTransactions.length === 0) {
    return 0; // All duplicates (shouldn't happen for manual imports, but keep as safety check)
  }

  // Prepare queued imports
  // Use per-transaction is_historical if provided, otherwise fall back to batch-level isHistorical
  // CSV data fields are stored only once per batch (on first transaction), others get null
  const queuedImports = newTransactions.map((txn, index) => {
    // Check if this transaction is a duplicate (for manual imports, we still queue them but mark status)
    const isDuplicate = existingHashes.has(txn.hash);
    const queuedInfo = queuedHashInfo.get(txn.hash);
    const isRejected = queuedInfo?.status === 'rejected';
    
    // For manual imports, mark duplicates as 'pending' so user can review them
    // For automatic imports, duplicates are already filtered out above
    const status = (isManualImport && isDuplicate && !isRejected) 
      ? 'pending' as const  // Allow duplicates for manual review
      : 'pending' as const; // Default status
    
    return {
      account_id: accountId,
      import_setup_id: importSetupId,
      transaction_date: txn.date,
      description: txn.description,
      merchant: txn.merchant,
      amount: txn.amount,
      transaction_type: txn.transaction_type,
      hash: txn.hash,
      original_data: txn.originalData ? (typeof txn.originalData === 'string' ? JSON.parse(txn.originalData) : txn.originalData) : null,
      suggested_category_id: txn.suggestedCategory || null,
      suggested_merchant: txn.merchant || null,
      target_account_id: txn.account_id || null,
      target_credit_card_id: txn.credit_card_id || null,
      status,
      is_historical: txn.is_historical !== undefined ? txn.is_historical : isHistorical,
      source_batch_id: sourceBatchId,
      source_fetched_at: new Date().toISOString(),
    // CSV mapping fields - store only on first transaction to avoid duplication
    csv_data: index === 0 ? (csvData || null) : null,
    csv_analysis: index === 0 ? (csvAnalysis || null) : null,
    csv_fingerprint: index === 0 ? (csvFingerprint || null) : null,
    csv_mapping_template_id: index === 0 ? (csvMappingTemplateId || null) : null,
      csv_file_name: index === 0 ? (csvFileName || null) : null,
      csv_mapping_name: index === 0 ? (csvMappingName || null) : null,
    };
  });

  // Insert queued imports
  const { error } = await supabase
    .from('queued_imports')
    .insert(queuedImports);

  if (error) {
    console.error('Error queueing transactions:', error);
    throw error;
  }

  return newTransactions.length;
}

/**
 * Get queued imports for an account
 */
export async function getQueuedImports(options?: {
  status?: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'imported';
  importSetupId?: number;
  batchId?: string;
  limit?: number;
  offset?: number;
}) {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // Explicitly select all fields including CSV mapping fields
  // PostgREST may not return JSONB fields with * selector in some cases
  let query = supabase
    .from('queued_imports')
    .select(`
      *,
      csv_data,
      csv_analysis,
      csv_file_name,
      csv_fingerprint,
      csv_mapping_template_id,
      csv_mapping_name
    `)
    .eq('account_id', accountId)
    .order('transaction_date', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.importSetupId) {
    query = query.eq('import_setup_id', options.importSetupId);
  }

  if (options?.batchId) {
    query = query.eq('source_batch_id', options.batchId);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching queued imports:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get batches of queued imports
 */
export async function getQueuedImportBatches() {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // Get all queued imports grouped by batch
  const { data: queuedImports, error } = await supabase
    .from('queued_imports')
    .select(`
      *,
      automatic_import_setups!inner(
        id,
        integration_name,
        source_type
      ),
      target_account:accounts!queued_imports_target_account_id_fkey(name),
      target_credit_card:credit_cards!queued_imports_target_credit_card_id_fkey(name)
    `)
    .eq('account_id', accountId)
    .in('status', ['pending', 'reviewing'])
    .order('source_fetched_at', { ascending: false });

  if (error) {
    console.error('Error fetching queued import batches:', error);
    throw error;
  }

  // Group by batch_id
  const batches = new Map<string, any[]>();
  
  (queuedImports || []).forEach(importItem => {
    const batchId = importItem.source_batch_id || 'no-batch';
    if (!batches.has(batchId)) {
      batches.set(batchId, []);
    }
    batches.get(batchId)!.push(importItem);
  });

  // Convert to batch format
  const batchList = Array.from(batches.entries()).map(([batchId, items]) => {
    const firstItem = items[0];
    const dates = items.map(i => i.transaction_date).sort();

    // Determine account name (from target_account_id or target_credit_card_id)
    const accountName = firstItem.target_account?.name || firstItem.target_credit_card?.name || null;
    const accountId = firstItem.target_account_id || firstItem.target_credit_card_id || null;
    const isCreditCard = !!firstItem.target_credit_card_id;

    // Extract filename from original_data for manual uploads
    let fileName: string | null = null;
    if (firstItem.automatic_import_setups?.source_type === 'manual') {
      // First, try to get filename from original_data (new format)
      if (firstItem.original_data) {
        try {
          const originalData = typeof firstItem.original_data === 'string' 
            ? JSON.parse(firstItem.original_data) 
            : firstItem.original_data;
          fileName = originalData._uploadFileName || null;
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      // Fallback: extract filename from batch ID for older uploads
      // Batch ID format: manual-{timestamp}-{sanitized-filename}
      // The filename is sanitized: non-alphanumeric chars become dashes
      // e.g., "statement.csv" becomes "statement-csv"
      if (!fileName && batchId.startsWith('manual-')) {
        const parts = batchId.split('-');
        if (parts.length >= 3) {
          // Everything after the timestamp (index 1) is the sanitized filename
          const sanitizedParts = parts.slice(2);
          if (sanitizedParts.length > 0) {
            // Try to restore common file extensions by detecting patterns like "csv", "pdf", etc.
            const commonExtensions = ['csv', 'pdf', 'xlsx', 'xls', 'txt', 'json'];
            const lastPart = sanitizedParts[sanitizedParts.length - 1].toLowerCase();
            
            if (commonExtensions.includes(lastPart)) {
              // Restore the dot before the extension
              fileName = sanitizedParts.slice(0, -1).join('-') + '.' + lastPart;
            } else {
              // No recognizable extension, just join with dashes
              fileName = sanitizedParts.join('-');
            }
          }
        }
      }
    }

    // Check if all transactions in batch are historical
    const allHistorical = items.every(i => i.is_historical === true);
    const someHistorical = items.some(i => i.is_historical === true);
    const isHistorical = allHistorical ? true : someHistorical ? 'mixed' : false;
    
    return {
      batch_id: batchId,
      import_setup_id: firstItem.import_setup_id,
      setup_name: firstItem.automatic_import_setups?.integration_name || 'Unknown',
      source_type: firstItem.automatic_import_setups?.source_type || 'email',
      count: items.length,
      date_range: {
        start: dates[0],
        end: dates[dates.length - 1],
      },
      created_at: firstItem.source_fetched_at,
      status: items.every(i => i.status === 'approved') ? 'approved' as const
        : items.some(i => i.status === 'approved') ? 'partially_approved' as const
        : items.some(i => i.status === 'reviewing') ? 'reviewing' as const
        : 'pending' as const,
      target_account_name: accountName,
      target_account_id: accountId,
      is_credit_card: isCreditCard,
      is_historical: isHistorical,
      file_name: fileName, // Filename for manual uploads
    };
  });

  return batchList;
}

/**
 * Update queued import status
 */
export async function updateQueuedImportStatus(
  queuedImportId: number,
  status: 'pending' | 'reviewing' | 'approved' | 'rejected',
  reviewNotes?: string
) {
  const { supabase, user } = await getAuthenticatedUser();

  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'reviewing' || status === 'approved' || status === 'rejected') {
    updateData.reviewed_by = user.id;
    updateData.reviewed_at = new Date().toISOString();
  }

  if (reviewNotes) {
    updateData.review_notes = reviewNotes;
  }

  const { error } = await supabase
    .from('queued_imports')
    .update(updateData)
    .eq('id', queuedImportId);

  if (error) {
    console.error('Error updating queued import status:', error);
    throw error;
  }
}

/**
 * Convert queued import to ParsedTransaction format for preview
 * Note: This requires fetching category splits from a separate table or review data
 */
export async function convertQueuedImportToParsedTransaction(queuedImport: any): Promise<any> {
  const { supabase } = await getAuthenticatedUser();
  
  // Fetch category splits if they exist (stored in review data or separate table)
  // For now, we'll create empty splits - they should be set during review
  let splits: any[] = [];
  
  // If there's a suggested category, create a default split
  if (queuedImport.suggested_category_id) {
    const { data: category } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', queuedImport.suggested_category_id)
      .single();
    
    if (category) {
      splits = [{
        categoryId: category.id,
        categoryName: category.name,
        amount: queuedImport.amount,
      }];
    }
  }

  return {
    id: `queued-${queuedImport.id}`,
    date: queuedImport.transaction_date,
    description: queuedImport.description,
    merchant: queuedImport.merchant,
    amount: queuedImport.amount,
    transaction_type: queuedImport.transaction_type,
    originalData: JSON.stringify(queuedImport.original_data || {}),
    hash: queuedImport.hash,
    suggestedCategory: queuedImport.suggested_category_id || undefined,
    account_id: queuedImport.target_account_id || undefined,
    credit_card_id: queuedImport.target_credit_card_id || undefined,
    isDuplicate: false,
    status: queuedImport.status === 'approved' ? 'confirmed' as const : 'pending' as const,
    splits,
    is_historical: queuedImport.is_historical || false,
  };
}

/**
 * Approve and import queued transactions
 * Note: Transactions must have splits (categories) set during review before approval
 */
export async function approveAndImportQueuedTransactions(queuedImportIds: number[], transactionsWithSplits?: any[]) {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');

  // If transactions with splits are provided, use them
  // Otherwise, fetch queued imports and convert (but they need splits!)
  let transactions: any[];
  let queuedImports: any[] | null = null;
  let batchId = 'unknown';
  
  if (transactionsWithSplits && transactionsWithSplits.length > 0) {
    transactions = transactionsWithSplits;
    
    // Still need to fetch batch_id for the import filename
    const { data: batchData } = await supabase
      .from('queued_imports')
      .select('source_batch_id')
      .in('id', queuedImportIds)
      .limit(1)
      .single();
    
    batchId = batchData?.source_batch_id || 'unknown';
  } else {
    // Fetch queued imports
    const { data: fetchedQueuedImports, error: fetchError } = await supabase
      .from('queued_imports')
      .select('*')
      .in('id', queuedImportIds)
      .eq('account_id', accountId)
      .eq('status', 'approved');

    if (fetchError) {
      console.error('Error fetching queued imports:', fetchError);
      throw fetchError;
    }

    if (!fetchedQueuedImports || fetchedQueuedImports.length === 0) {
      return { imported: 0 };
    }

    queuedImports = fetchedQueuedImports;
    
    // Get batch_id from first queued import
    batchId = fetchedQueuedImports[0]?.source_batch_id || 'unknown';

    // Convert to ParsedTransaction format
    // Note: This requires splits to be set - they should come from the review UI
    transactions = await Promise.all(
      fetchedQueuedImports.map(qi => convertQueuedImportToParsedTransaction(qi))
    );
  }

  // Filter out transactions without splits
  const validTransactions = transactions.filter(txn => txn.splits && txn.splits.length > 0);
  
  if (validTransactions.length === 0) {
    throw new Error('No transactions with category splits to import');
  }

  // Import using existing import function
  const { importTransactions } = await import('../supabase-queries');
  
  // Use per-transaction is_historical if provided, otherwise fall back to false
  // The transactions array should already have is_historical set from convertQueuedImportToParsedTransaction
  // or from the UI when transactionsWithSplits is provided
  const importedCount = await importTransactions(
    validTransactions,
    false, // Global flag - per-transaction is_historical is used instead
    `Automatic Import - Batch ${batchId}`
  );

  // Map validTransactions back to queued import IDs
  // If transactionsWithSplits was provided, extract IDs from transaction.id (queued-{id})
  // Otherwise, use the queuedImports array we fetched earlier
  let importedQueuedIds: number[];
  
  if (transactionsWithSplits && transactionsWithSplits.length > 0) {
    // Extract queued import IDs from transaction IDs (format: queued-{id})
    importedQueuedIds = validTransactions
      .map(txn => {
        if (txn.id.startsWith('queued-')) {
          const id = parseInt(txn.id.replace('queued-', ''), 10);
          return isNaN(id) ? null : id;
        }
        return null;
      })
      .filter((id): id is number => id !== null)
      .slice(0, importedCount);
  } else if (queuedImports) {
    // Map validTransactions to queued import IDs by matching hashes
    const validHashes = new Set(validTransactions.map(t => t.hash));
    importedQueuedIds = queuedImports
      .filter(qi => validHashes.has(qi.hash))
      .map(qi => qi.id)
      .slice(0, importedCount);
  } else {
    // Fallback: use queuedImportIds in order (less accurate but better than nothing)
    importedQueuedIds = queuedImportIds.slice(0, importedCount);
  }
  
  // Update queued imports to mark as imported
  if (importedQueuedIds.length > 0) {
    await supabase
      .from('queued_imports')
      .update({
        status: 'imported',
        imported_at: new Date().toISOString(),
      })
      .in('id', importedQueuedIds);
  }

  return { imported: importedCount };
}
