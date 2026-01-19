import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';

/**
 * GET /api/categories/monthly-spending
 * Returns current month's spending for each category
 */
export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    // Get current month's date range (YYYY-MM-DD format)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const startDate = `${year}-${month}-01`;
    
    // Calculate last day of current month
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    // Fetch all transactions for current month with splits
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        id,
        date,
        transaction_type,
        splits:transaction_splits(
          category_id,
          amount
        )
      `)
      .eq('budget_account_id', accountId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    // Calculate spending by category
    // For expenses: add amount to spending
    // For income: subtract amount from spending (refunds, etc.)
    const spendingByCategory: Record<number, number> = {};

    transactions?.forEach((transaction: any) => {
      const transactionType = transaction.transaction_type || 'expense'; // Default to expense for backward compatibility
      transaction.splits?.forEach((split: any) => {
        const categoryId = split.category_id;
        const amount = Number(split.amount);
        
        if (!spendingByCategory[categoryId]) {
          spendingByCategory[categoryId] = 0;
        }
        
        // Expenses add to spending, income subtracts from spending
        if (transactionType === 'expense') {
          spendingByCategory[categoryId] += amount;
        } else if (transactionType === 'income') {
          spendingByCategory[categoryId] -= amount;
        }
      });
    });

    return NextResponse.json(spendingByCategory);
  } catch (error) {
    console.error('Error in monthly-spending:', error);
    return NextResponse.json(
      { error: 'Failed to calculate monthly spending' },
      { status: 500 }
    );
  }
}


