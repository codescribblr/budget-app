import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
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

    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    // Fetch all transactions with splits in a single query
    const { data: transactions, error: fetchError } = await supabase
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
      .in('id', transactionIds)
      .eq('budget_account_id', accountId);

    if (fetchError || !transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch transactions or unauthorized' },
        { status: 400 }
      );
    }

    // Collect all unique category IDs that need balance updates
    const categoryUpdates = new Map<number, number>();
    const categoryIds = new Set<number>();
    
    transactions.forEach(transaction => {
      transaction.splits?.forEach((split: any) => {
        categoryIds.add(split.category_id);
        const current = categoryUpdates.get(split.category_id) || 0;
        categoryUpdates.set(split.category_id, current + Number(split.amount));
      });
    });

    // Fetch all categories in a single query (fixes N+1 problem)
    if (categoryIds.size > 0) {
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, is_system, current_balance')
        .in('id', Array.from(categoryIds))
        .eq('account_id', accountId);

      if (!categoriesError && categories) {
        // Update all categories in parallel
        const updatePromises = categories
          .filter(cat => !cat.is_system && categoryUpdates.has(cat.id))
          .map(category => {
            const adjustment = categoryUpdates.get(category.id)!;
            return supabase
              .from('categories')
              .update({
                current_balance: Number(category.current_balance) + adjustment,
                updated_at: new Date().toISOString(),
              })
              .eq('id', category.id);
          });
        
        await Promise.all(updatePromises);
      }
    }

    let deletedCount = 0;

    for (const transaction of transactions) {
      try {
        // Delete the transaction splits
        const { error: deleteSplitsError } = await supabase
          .from('transaction_splits')
          .delete()
          .eq('transaction_id', transaction.id);

        if (deleteSplitsError) {
          console.error(`Error deleting splits for transaction ${transaction.id}:`, deleteSplitsError);
          continue;
        }

        // Delete the imported_transaction_links (but keep the imported_transaction record)
        // This preserves the hash so the transaction won't be re-imported
        const { error: deleteLinkError } = await supabase
          .from('imported_transaction_links')
          .delete()
          .eq('transaction_id', transaction.id);

        if (deleteLinkError) {
          console.error(`Error deleting link for transaction ${transaction.id}:`, deleteLinkError);
          // Continue anyway - this is not critical
        }

        // Delete the transaction itself
        const { error: deleteError } = await supabase
          .from('transactions')
          .delete()
          .eq('id', transaction.id)
          .eq('budget_account_id', accountId);

        if (deleteError) {
          console.error(`Error deleting transaction ${transaction.id}:`, deleteError);
          continue;
        }

        deletedCount++;
      } catch (error) {
        console.error(`Error processing transaction ${transaction.id}:`, error);
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

