import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import type { ParsedTransaction } from '@/lib/import-types';

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
    const { transactions } = body as { transactions: ParsedTransaction[] };

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

    // Batch update queued imports
    for (const update of updates) {
      const { error } = await supabase
        .from('queued_imports')
        .update({
          suggested_category_id: update.suggested_category_id,
          status: update.status,
          original_data: update.original_data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', update.id)
        .eq('account_id', accountId);

      if (error) {
        // Continue with other updates even if one fails
      }
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

