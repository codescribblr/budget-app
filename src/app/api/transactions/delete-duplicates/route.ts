import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkWriteAccess } from '@/lib/api-helpers';
import { getActiveAccountId } from '@/lib/account-context';

export async function POST(request: Request) {
  try {
    // Check write access
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { transactionIds } = await request.json();

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json(
        { error: 'No transaction IDs provided' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let deletedCount = 0;

    for (const transactionId of transactionIds) {
      try {
        // Get the transaction with its splits
        const { data: transaction, error: fetchError } = await supabase
          .from('transactions')
          .select(`
            id,
            budget_account_id,
            date,
            description,
            total_amount,
            splits:transaction_splits(
              id,
              category_id,
              amount
            )
          `)
          .eq('id', transactionId)
          .eq('budget_account_id', accountId)
          .single();

        if (fetchError || !transaction) {
          console.error(`Transaction ${transactionId} not found or unauthorized`);
          continue;
        }

        // Reverse the category balance changes
        for (const split of transaction.splits) {
          const { data: category } = await supabase
            .from('categories')
            .select('is_system, current_balance')
            .eq('id', split.category_id)
            .single();

          if (category && !category.is_system) {
            await supabase
              .from('categories')
              .update({
                current_balance: Number(category.current_balance) + Number(split.amount),
                updated_at: new Date().toISOString(),
              })
              .eq('id', split.category_id);
          }
        }

        // Delete the transaction splits
        const { error: deleteSplitsError } = await supabase
          .from('transaction_splits')
          .delete()
          .eq('transaction_id', transactionId);

        if (deleteSplitsError) {
          console.error(`Error deleting splits for transaction ${transactionId}:`, deleteSplitsError);
          continue;
        }

        // Delete the imported_transaction_links (but keep the imported_transaction record)
        // This preserves the hash so the transaction won't be re-imported
        const { error: deleteLinkError } = await supabase
          .from('imported_transaction_links')
          .delete()
          .eq('transaction_id', transactionId);

        if (deleteLinkError) {
          console.error(`Error deleting link for transaction ${transactionId}:`, deleteLinkError);
          // Continue anyway - this is not critical
        }

        // Delete the transaction itself
        const { error: deleteError } = await supabase
          .from('transactions')
          .delete()
          .eq('id', transactionId)
          .eq('budget_account_id', accountId);

        if (deleteError) {
          console.error(`Error deleting transaction ${transactionId}:`, deleteError);
          continue;
        }

        deletedCount++;
      } catch (error) {
        console.error(`Error processing transaction ${transactionId}:`, error);
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
    });
  } catch (error: any) {
    console.error('Error deleting duplicate transactions:', error);
    return NextResponse.json(
      { error: 'Failed to delete transactions' },
      { status: 500 }
    );
  }
}

