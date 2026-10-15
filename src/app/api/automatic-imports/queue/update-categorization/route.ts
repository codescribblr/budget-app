import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import type { ParsedTransaction } from '@/lib/import-types';
import { persistCompletedTasks } from '@/lib/processing-tasks-server';
import type { ProcessingTask } from '@/lib/processing-tasks';

/**
 * POST /api/automatic-imports/queue/update-categorization
 * Update queued imports with categorization results from processTransactions
 */
export async function POST(request: Request) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const body = await request.json();
    const { transactions, batchId, completedTasks } = body as {
      transactions: ParsedTransaction[];
      batchId?: string;
      completedTasks?: ProcessingTask[];
    };
    if (completedTasks !== undefined && (!batchId || !Array.isArray(completedTasks) ||
      completedTasks.some(task => task !== 'duplicate_detection' && task !== 'categorization'))) {
      return NextResponse.json({ error: 'Invalid processing checkpoint' }, { status: 400 });
    }

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions provided' },
        { status: 400 }
      );
    }

    // Update each queued import with categorization results
    const updates = transactions.map((txn) => {
      // Extract queued import ID from transaction ID (format: queued-{id})
      if (typeof txn.id !== 'string' || !txn.id.startsWith('queued-')) {
        return null;
      }

      const queuedImportId = parseInt(txn.id.replace('queued-', ''));
      if (isNaN(queuedImportId)) {
        return null;
      }

      // Get suggested category from first split if available
      const suggestedCategoryId = txn.splits && txn.splits.length > 0
        ? txn.splits[0].categoryId
        : null;

      // Store duplicate information in original_data
      // For manual imports, we want to show duplicates for review, so don't set status to 'rejected'
      let originalData: any = {};
      if (txn.originalData) {
        try {
          // Handle both string and object formats
          originalData = typeof txn.originalData === 'string' 
            ? JSON.parse(txn.originalData) 
            : txn.originalData;
        } catch (err) {
          // If parsing fails, use empty object
          originalData = {};
        }
      }
      const updatedOriginalData = {
        ...originalData,
        isDuplicate: txn.isDuplicate || false,
        duplicateType: txn.duplicateType || null,
      };

      return {
        id: queuedImportId,
        suggested_category_id: suggestedCategoryId,
        status: 'reviewing' as const, // Keep as 'reviewing' so duplicates can be reviewed
        original_data: updatedOriginalData,
      };
    }).filter((update): update is NonNullable<typeof update> => update !== null);
    if (updates.length !== transactions.length) {
      return NextResponse.json({ error: 'Invalid queued transaction ID' }, { status: 400 });
    }

    // Batch update queued imports in parallel chunks
    const CHUNK_SIZE = 25;
    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      const results = await Promise.allSettled(
        chunk.map(async (update) => {
          let query = supabase
            .from('queued_imports')
            .update({
              suggested_category_id: update.suggested_category_id,
              status: update.status,
              original_data: update.original_data,
              updated_at: new Date().toISOString(),
            })
            .eq('id', update.id)
            .eq('account_id', accountId);
          if (batchId) query = query.eq('source_batch_id', batchId);
          const { data, error } = await query.select('id');
          if (error || !data?.length) throw new Error('Could not save all transaction results. Please retry processing.');
        })
      );
      if (results.some(result => result.status === 'rejected')) {
        throw new Error('Could not save all transaction results. Please retry processing.');
      }
    }

    // Only mark the step complete once every result was saved successfully.
    if (batchId && completedTasks?.length) {
      await persistCompletedTasks(supabase, accountId, batchId, completedTasks);
    }

    return NextResponse.json({
      success: true,
      updated: updates.length,
    });
  } catch (error: any) {
    console.error('Error in POST /api/automatic-imports/queue/update-categorization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update categorization' },
      { status: 500 }
    );
  }
}


