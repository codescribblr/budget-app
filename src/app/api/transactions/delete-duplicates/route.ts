import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { checkWriteAccess } from '@/lib/api-helpers';
import { getActiveAccountId } from '@/lib/account-context';
import { logBalanceChanges } from '@/lib/audit/category-balance-audit';

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
        transaction_type,
        is_historical,
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
    // Only process non-historical transactions
    const categoryIds = new Set<number>();
    const transactionAuditLogs: Array<{
      transactionId: number;
      transactionDate: string;
      transactionDescription: string;
      transactionType: string;
      categoryId: number;
      oldBalance: number;
      balanceChange: number;
    }> = [];
    
    // Sort transactions by date (ascending) for proper audit log ordering
    const sortedTransactions = transactions
      .filter(t => !t.is_historical) // Only process non-historical
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateA - dateB; // Ascending order (oldest first)
      });

    // Get initial category balances
    sortedTransactions.forEach(transaction => {
      transaction.splits?.forEach((split: any) => {
        categoryIds.add(split.category_id);
      });
    });

    if (categoryIds.size > 0) {
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, is_system, current_balance')
        .in('id', Array.from(categoryIds))
        .eq('account_id', accountId);

      if (!categoriesError && categories) {
        // Store initial balances
        const initialBalanceMap = new Map<number, number>();
        const runningBalanceMap = new Map<number, number>();
        categories
          .filter(cat => !cat.is_system)
          .forEach(cat => {
            const balance = Number(cat.current_balance);
            initialBalanceMap.set(cat.id, balance);
            runningBalanceMap.set(cat.id, balance);
          });

        // Process transactions in date order and track individual changes
        sortedTransactions.forEach(transaction => {
          const transactionType = transaction.transaction_type || 'expense';
          transaction.splits?.forEach((split: any) => {
            const category = categories.find(c => c.id === split.category_id);
            if (!category || category.is_system) return;

            // Reverse the transaction's impact:
            // - If it was income (added to balance), subtract it (negative)
            // - If it was expense (subtracted from balance), add it back (positive)
            const adjustment = transactionType === 'income'
              ? -Number(split.amount)  // Reverse income: subtract
              : Number(split.amount);   // Reverse expense: add back

            const oldBalance = runningBalanceMap.get(split.category_id) || initialBalanceMap.get(split.category_id) || 0;
            
            // Track individual transaction for audit logging
            transactionAuditLogs.push({
              transactionId: transaction.id,
              transactionDate: transaction.date,
              transactionDescription: transaction.description,
              transactionType,
              categoryId: split.category_id,
              oldBalance,
              balanceChange: adjustment,
            });

            // Update running balance for next transaction
            runningBalanceMap.set(split.category_id, oldBalance + adjustment);
          });
        });

        // Calculate final balances for updates
        const categoryUpdates = new Map<number, number>();
        transactionAuditLogs.forEach(log => {
          const current = categoryUpdates.get(log.categoryId) || 0;
          categoryUpdates.set(log.categoryId, current + log.balanceChange);
        });

        // Update all categories in parallel
        const updatePromises = categories
          .filter(cat => !cat.is_system && categoryUpdates.has(cat.id))
          .map(category => {
            const adjustment = categoryUpdates.get(category.id)!;
            const oldBalance = initialBalanceMap.get(category.id)!;
            const newBalance = oldBalance + adjustment;
            return supabase
              .from('categories')
              .update({
                current_balance: newBalance,
                updated_at: new Date().toISOString(),
              })
              .eq('id', category.id);
          });
        
        await Promise.all(updatePromises);

        // Log individual balance changes for each transaction (already sorted by date ascending)
        const auditChanges = transactionAuditLogs.map(log => ({
          categoryId: log.categoryId,
          oldBalance: log.oldBalance,
          newBalance: log.oldBalance + log.balanceChange,
          changeType: 'transaction_delete' as const,
          metadata: {
            transaction_id: log.transactionId,
            transaction_description: log.transactionDescription,
            transaction_date: log.transactionDate,
            deleted_transaction_ids: transactionIds,
          },
        }));

        await logBalanceChanges(auditChanges);
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


