import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import { updateTransaction } from '@/lib/supabase-queries';

/**
 * POST /api/transactions/bulk-update
 * Bulk update multiple transactions
 */
export async function POST(request: Request) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const body = await request.json();
    const { transactionIds, updates } = body as {
      transactionIds: number[];
      updates: {
        date?: string;
        categoryId?: number | null;
        accountId?: number | null;
        creditCardId?: number | null;
        isHistorical?: boolean;
      };
    };

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json({ error: 'transactionIds is required and must be an array' }, { status: 400 });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const updatedTransactions = [];
    const errors = [];

    // Update each transaction
    for (const transactionId of transactionIds) {
      try {
        const updateData: {
          date?: string;
          account_id?: number | null;
          credit_card_id?: number | null;
          splits?: { category_id: number; amount: number }[];
        } = {};

        if (updates.date !== undefined) {
          updateData.date = updates.date;
        }

        if (updates.categoryId !== undefined) {
          // Get transaction to get its total_amount
          const { supabase } = await getAuthenticatedUser();
          const { data: transaction } = await supabase
            .from('transactions')
            .select('total_amount')
            .eq('id', transactionId)
            .single();

          if (transaction) {
            if (updates.categoryId === null) {
              updateData.splits = [];
            } else {
              updateData.splits = [{
                category_id: updates.categoryId,
                amount: transaction.total_amount,
              }];
            }
          }
        }

        if (updates.accountId !== undefined) {
          updateData.account_id = updates.accountId;
        }
        if (updates.creditCardId !== undefined) {
          updateData.credit_card_id = updates.creditCardId;
        }
        if (updates.accountId === null && updates.creditCardId === null) {
          updateData.account_id = null;
          updateData.credit_card_id = null;
        }

        const updated = await updateTransaction(transactionId, updateData);
        if (updated) {
          // Handle is_historical separately since updateTransaction doesn't support it yet
          if (updates.isHistorical !== undefined) {
            const { supabase } = await getAuthenticatedUser();
            await supabase
              .from('transactions')
              .update({ is_historical: updates.isHistorical })
              .eq('id', transactionId);
            
            // Update the returned transaction
            updated.is_historical = updates.isHistorical;
          }
          updatedTransactions.push(updated);
        } else {
          errors.push({ transactionId, error: 'Transaction not found' });
        }
      } catch (error: any) {
        console.error(`Error updating transaction ${transactionId}:`, error);
        errors.push({ transactionId, error: error.message || 'Failed to update transaction' });
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedTransactions.length,
      errors: errors.length > 0 ? errors : undefined,
      transactions: updatedTransactions,
    });
  } catch (error: any) {
    console.error('Error in POST /api/transactions/bulk-update:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to bulk update transactions' },
      { status: 500 }
    );
  }
}
