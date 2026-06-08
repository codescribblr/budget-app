import { NextResponse } from 'next/server';
import { approveAndImportQueuedTransactions } from '@/lib/automatic-imports/queue-manager';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * POST /api/automatic-imports/queue/approve-batch
 * Approve and import queued transactions from a batch with their splits
 */
export async function POST(request: Request) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const body = await request.json();
    const { batchId, transactions } = body;

    if (!batchId || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: 'batchId and transactions array are required' },
        { status: 400 }
      );
    }

    // Extract queued import IDs from transaction IDs (format: queued-{id})
    const queuedImportIds = transactions
      .map((txn: any) => {
        if (typeof txn.id === 'string' && txn.id.startsWith('queued-')) {
          return parseInt(txn.id.replace('queued-', ''));
        }
        return null;
      })
      .filter((id): id is number => id !== null);

    if (queuedImportIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid queued import IDs found in transactions' },
        { status: 400 }
      );
    }

    // Fetch queued imports to get the original hash
    const { getAuthenticatedUser } = await import('@/lib/supabase-queries');
    const { getActiveAccountId } = await import('@/lib/account-context');
    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account' },
        { status: 400 }
      );
    }

    // Fetch queued imports to get hashes
    const { data: queuedImports } = await supabase
      .from('queued_imports')
      .select('id, hash')
      .in('id', queuedImportIds)
      .eq('account_id', accountId);

    // Create a map of queued import ID to hash
    const hashMap = new Map(queuedImports?.map(qi => [qi.id, qi.hash]) || []);

    // Import generateTransactionHash for fallback
    const { generateTransactionHash } = await import('@/lib/csv-parser-helpers');

    // Convert transactions to the format expected by approveAndImportQueuedTransactions
    const transactionsWithSplits = transactions.map((txn: any) => {
      // Extract queued import ID to get the hash
      let hash = '';
      if (typeof txn.id === 'string' && txn.id.startsWith('queued-')) {
        const queuedId = parseInt(txn.id.replace('queued-', ''));
        hash = hashMap.get(queuedId) || '';
      }
      
      // If hash is still empty, generate it (fallback)
      if (!hash && txn.date && txn.description && txn.amount !== undefined) {
        hash = generateTransactionHash(txn.date, txn.description, txn.amount, txn.originalData);
      }

      return {
        id: txn.id,
        date: txn.date,
        description: txn.description,
        amount: txn.amount,
        transaction_type: txn.transaction_type,
        merchant: txn.merchant,
        account_id: txn.account_id,
        credit_card_id: txn.credit_card_id,
        is_historical: txn.is_historical !== undefined ? txn.is_historical : false,
        splits: txn.splits || [],
        hash: hash,
        originalData: txn.originalData || null,
      };
    });

    // Approve and import
    const result = await approveAndImportQueuedTransactions(queuedImportIds, transactionsWithSplits);

    // Clean up manual import setups if this was a manual upload batch
    try {
      const firstQueuedId = queuedImportIds[0];
      if (firstQueuedId) {
        const { data: firstQueuedImport } = await supabase
          .from('queued_imports')
          .select('import_setup_id')
          .eq('id', firstQueuedId)
          .single();

        if (firstQueuedImport?.import_setup_id) {
          const { data: setup } = await supabase
            .from('automatic_import_setups')
            .select('source_type')
            .eq('id', firstQueuedImport.import_setup_id)
            .single();

          if (setup?.source_type === 'manual') {
            const { cleanupManualImportSetups } = await import('@/lib/automatic-imports/queue-manager');
            await cleanupManualImportSetups(accountId);
          }
        }
      }
    } catch (err) {
      // Non-fatal - just log
      console.warn('Failed to cleanup manual import setups:', err);
    }

    // Return format compatible with TransactionPreview expectations
    return NextResponse.json({
      imported: result.imported || 0,
    });
  } catch (error: any) {
    console.error('Error in POST /api/automatic-imports/queue/approve-batch:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve and import transactions' },
      { status: 500 }
    );
  }
}


