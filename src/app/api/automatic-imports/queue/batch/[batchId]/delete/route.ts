import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * DELETE /api/automatic-imports/queue/batch/[batchId]/delete
 * Delete transactions in a queued import batch (actually deletes rows from database)
 * If transactionIds are provided in the request body, only delete those transactions.
 * Otherwise, delete all transactions in the batch.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { batchId } = await params;
    
    // Parse request body to get optional transaction IDs
    // Note: DELETE requests can have a body, but we need to check if it exists
    let transactionIds: number[] | null = null;
    try {
      // Read the request body
      const body = await request.json();
      if (body && body.transactionIds && Array.isArray(body.transactionIds) && body.transactionIds.length > 0) {
        // Extract numeric IDs from "queued-{id}" format
        transactionIds = body.transactionIds
          .map((id: string | number) => {
            if (typeof id === 'string' && id.startsWith('queued-')) {
              const numId = parseInt(id.replace('queued-', ''), 10);
              return isNaN(numId) ? null : numId;
            }
            return typeof id === 'number' ? id : null;
          })
          .filter((id: number | null): id is number => id !== null);
        
        console.log('[Delete] Parsed transaction IDs:', {
          received: body.transactionIds,
          parsed: transactionIds,
          count: transactionIds?.length || 0,
        });
        
        if (!transactionIds || transactionIds.length === 0) {
          console.warn('[Delete] No valid transaction IDs found after parsing');
        }
      } else {
        console.log('[Delete] No transactionIds in request body or empty array');
      }
    } catch (err) {
      // Request body might be empty or invalid JSON - that's okay, we'll delete all
      console.log('[Delete] No request body or failed to parse:', err instanceof Error ? err.message : err);
    }

    // Get setup info to determine source type
    const { data: queuedImports } = await supabase
      .from('queued_imports')
      .select('import_setup_id')
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId)
      .limit(1);

    if (!queuedImports || queuedImports.length === 0) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const importSetupId = queuedImports[0].import_setup_id;

    // Fetch setup to get source_type
    const { data: setup } = await supabase
      .from('automatic_import_setups')
      .select('source_type, integration_name')
      .eq('id', importSetupId)
      .single();

    // First, verify which transactions exist before attempting to delete
    if (transactionIds && transactionIds.length > 0) {
      const { data: existingTransactions, error: checkError } = await supabase
        .from('queued_imports')
        .select('id, status')
        .eq('account_id', accountId)
        .eq('source_batch_id', batchId)
        .in('id', transactionIds);
      
      console.log('[Delete] Existing transactions check:', {
        accountId,
        batchId,
        requestedIds: transactionIds,
        requestedIdsType: transactionIds.map(id => typeof id),
        foundTransactions: existingTransactions?.map(t => ({ id: t.id, status: t.status })) || [],
        foundCount: existingTransactions?.length || 0,
        checkError: checkError?.message,
        checkErrorCode: checkError?.code,
        checkErrorDetails: checkError,
      });

      if (checkError) {
        console.error('[Delete] Error checking existing transactions:', checkError);
        return NextResponse.json({
          success: false,
          deleted: 0,
          error: 'Failed to check transactions',
          details: checkError.message,
        }, { status: 500 });
      }

      if (!existingTransactions || existingTransactions.length === 0) {
        console.warn('[Delete] No transactions found matching the provided IDs');
        return NextResponse.json({
          success: false,
          deleted: 0,
          error: 'No transactions found matching the provided IDs',
          requestedIds: transactionIds,
          accountId,
          batchId,
        });
      }

      // Check which transactions can be deleted (not already imported)
      const deletableTransactions = existingTransactions.filter(t => t.status !== 'imported');
      console.log('[Delete] Deletable transactions:', {
        total: existingTransactions.length,
        deletable: deletableTransactions.length,
        alreadyImported: existingTransactions.length - deletableTransactions.length,
        statuses: existingTransactions.map(t => t.status),
      });

      if (deletableTransactions.length === 0) {
        return NextResponse.json({
          success: false,
          deleted: 0,
          error: 'All selected transactions have already been imported',
        });
      }
    }

    // Before deleting, fetch the transaction data to add to imported_transactions
    // This prevents them from being re-queued in future fetches
    let transactionsToMarkAsImported: Array<{
      hash: string;
      transaction_date: string;
      description: string;
      amount: number;
      merchant: string;
    }> = [];

    // Fetch transaction data before deleting
    let fetchQuery = supabase
      .from('queued_imports')
      .select('hash, transaction_date, description, amount, merchant')
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId)
      .neq('status', 'imported');

    if (transactionIds && transactionIds.length > 0) {
      fetchQuery = fetchQuery.in('id', transactionIds);
    } else {
      fetchQuery = fetchQuery.in('status', ['pending', 'reviewing', 'rejected']);
    }

    const { data: transactionsToDelete } = await fetchQuery;

    if (transactionsToDelete && transactionsToDelete.length > 0) {
      transactionsToMarkAsImported = transactionsToDelete.map(t => ({
        hash: t.hash,
        transaction_date: t.transaction_date,
        description: t.description,
        amount: t.amount,
        merchant: t.merchant,
      }));
    }

    // Actually DELETE the rows from the database (not just update status)
    // Build query to delete transactions
    let deleteQuery = supabase
      .from('queued_imports')
      .delete()
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId);

    // If specific transaction IDs are provided, filter by them
    // Otherwise, filter by status to only delete pending/reviewing/rejected (not already imported)
    if (transactionIds && transactionIds.length > 0) {
      // When deleting specific transactions, include all statuses except 'imported'
      // This allows deleting duplicates (which may have status 'pending'/'reviewing'/'rejected' in DB) and other transactions
      deleteQuery = deleteQuery.in('id', transactionIds).neq('status', 'imported');
      
      console.log('[Delete] Delete query filters:', {
        accountId,
        batchId,
        transactionIds,
        statusFilter: '!= imported',
      });
    } else {
      // When deleting all, only delete pending/reviewing/rejected (not already imported)
      deleteQuery = deleteQuery.in('status', ['pending', 'reviewing', 'rejected']);
      console.log('[Delete] Delete all query filters:', {
        accountId,
        batchId,
        statusFilter: 'IN (pending, reviewing, rejected)',
      });
    }

    const { data, error } = await deleteQuery.select('id');

    if (error) {
      console.error('[Delete] Error deleting transactions:', error);
      return NextResponse.json({ error: 'Failed to delete transactions' }, { status: 500 });
    }

    console.log('[Delete] Deletion result:', {
      transactionIdsProvided: transactionIds?.length || 0,
      deletedCount: data?.length || 0,
      deletedIds: data?.map(d => d.id) || [],
    });

    // Add deleted transactions to imported_transactions to prevent re-queuing
    // This ensures that deleted transactions won't be fetched again in future imports
    if (transactionsToMarkAsImported.length > 0) {
      // Check which hashes already exist in imported_transactions to avoid duplicates
      const hashesToCheck = transactionsToMarkAsImported.map(t => t.hash);
      const { data: existingImported } = await supabase
        .from('imported_transactions')
        .select('hash')
        .eq('user_id', user.id)
        .in('hash', hashesToCheck);

      const existingHashes = new Set(existingImported?.map(t => t.hash) || []);
      
      // Only insert transactions that don't already exist in imported_transactions
      const newTransactionsToImport = transactionsToMarkAsImported.filter(
        t => !existingHashes.has(t.hash)
      );

      if (newTransactionsToImport.length > 0) {
        const importDate = new Date().toISOString();
        const importedTransactionsData = newTransactionsToImport.map(txn => ({
          user_id: user.id,
          account_id: accountId,
          import_date: importDate,
          source_type: setup?.source_type === 'manual' ? 'CSV Import' : (setup?.integration_name || 'Automatic Import'),
          source_identifier: `Deleted from queue - Batch ${batchId}`,
          transaction_date: txn.transaction_date,
          merchant: txn.merchant || txn.description,
          description: txn.description,
          amount: txn.amount,
          hash: txn.hash,
          metadata: {
            deletedFromQueue: true,
            deletedAt: importDate,
            batchId: batchId,
          },
        }));

        const { error: importError } = await supabase
          .from('imported_transactions')
          .insert(importedTransactionsData);

        if (importError) {
          // Non-fatal - log but don't fail the delete operation
          console.warn('[Delete] Failed to add deleted transactions to imported_transactions:', importError);
        } else {
          console.log('[Delete] Added', newTransactionsToImport.length, 'deleted transactions to imported_transactions (', transactionsToMarkAsImported.length - newTransactionsToImport.length, 'already existed)');
        }
      } else {
        console.log('[Delete] All', transactionsToMarkAsImported.length, 'deleted transactions already exist in imported_transactions');
      }
    }

    // Clean up manual import setups if this was a manual upload batch
    if (setup?.source_type === 'manual') {
      try {
        const { cleanupManualImportSetups } = await import('@/lib/automatic-imports/queue-manager');
        await cleanupManualImportSetups(accountId);
      } catch (err) {
        // Non-fatal - just log
        console.warn('Failed to cleanup manual import setups:', err);
      }
    }

    return NextResponse.json({
      success: true,
      deleted: data?.length || 0,
      source_type: setup?.source_type || 'unknown',
      integration_name: setup?.integration_name || 'Unknown',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/automatic-imports/queue/batch/[batchId]/delete:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete batch' },
      { status: 500 }
    );
  }
}

