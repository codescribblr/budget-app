/**
 * Queue Manager for Automatic Imports
 * Handles queuing transactions, deduplication, and batch management
 */

import { getAuthenticatedUser } from '../supabase-queries';
import { getActiveAccountId } from '../account-context';
import type { ParsedTransaction } from '../import-types';
import { generateTransactionHash } from '../csv-parser';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface QueueTransactionOptions {
  importSetupId: number;
  transactions: ParsedTransaction[];
  sourceBatchId: string;
  isHistorical?: boolean;
  accountId?: number; // Optional: provide accountId for webhook contexts
  supabase?: SupabaseClient; // Optional: provide supabase client for webhook contexts
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

  const { importSetupId, transactions, sourceBatchId, isHistorical = false } = options;

  // Get existing hashes to check for duplicates
  const hashes = transactions.map(t => t.hash);
  
  // Check against imported_transactions
  const { data: existingImported } = await supabase
    .from('imported_transactions')
    .select('hash')
    .eq('account_id', accountId)
    .in('hash', hashes);

  // Check against queued_imports (same batch and other batches)
  const { data: existingQueued } = await supabase
    .from('queued_imports')
    .select('hash')
    .eq('account_id', accountId)
    .in('hash', hashes);

  const existingHashes = new Set([
    ...(existingImported?.map(t => t.hash) || []),
    ...(existingQueued?.map(t => t.hash) || []),
  ]);

  // Filter out duplicates
  const newTransactions = transactions.filter(t => !existingHashes.has(t.hash));

  if (newTransactions.length === 0) {
    return 0; // All duplicates
  }

  // Prepare queued imports
  const queuedImports = newTransactions.map(txn => ({
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
    status: 'pending' as const,
    is_historical: isHistorical,
    source_batch_id: sourceBatchId,
    source_fetched_at: new Date().toISOString(),
  }));

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

  let query = supabase
    .from('queued_imports')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

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
      )
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
  
  if (transactionsWithSplits && transactionsWithSplits.length > 0) {
    transactions = transactionsWithSplits;
  } else {
    // Fetch queued imports
    const { data: queuedImports, error: fetchError } = await supabase
      .from('queued_imports')
      .select('*')
      .in('id', queuedImportIds)
      .eq('account_id', accountId)
      .eq('status', 'approved');

    if (fetchError) {
      console.error('Error fetching queued imports:', fetchError);
      throw fetchError;
    }

    if (!queuedImports || queuedImports.length === 0) {
      return { imported: 0 };
    }

    // Convert to ParsedTransaction format
    // Note: This requires splits to be set - they should come from the review UI
    transactions = await Promise.all(
      queuedImports.map(qi => convertQueuedImportToParsedTransaction(qi))
    );
  }

  // Filter out transactions without splits
  const validTransactions = transactions.filter(txn => txn.splits && txn.splits.length > 0);
  
  if (validTransactions.length === 0) {
    throw new Error('No transactions with category splits to import');
  }

  // Import using existing import function
  const { importTransactions } = await import('../supabase-queries');
  const isHistorical = transactions[0].is_historical || false;
  const batchId = transactions[0].source_batch_id || 'unknown';
  
  const importedCount = await importTransactions(
    validTransactions,
    isHistorical,
    `Automatic Import - Batch ${batchId}`
  );

  // Update queued imports to mark as imported
  const importedIds = queuedImportIds.slice(0, importedCount);
  
  await supabase
    .from('queued_imports')
    .update({
      status: 'imported',
      imported_at: new Date().toISOString(),
    })
    .in('id', importedIds);

  return { imported: importedCount };
}
