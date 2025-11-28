import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveAccountId } from '@/lib/account-context';

/**
 * GET /api/categories/ytd-spending
 * Returns year-to-date spending for each category (from Jan 1 to today)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    // Get year-to-date date range (from Jan 1 to today)
    const now = new Date();
    const year = now.getFullYear();
    const startDate = `${year}-01-01`;
    const endDate = now.toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format

    // Fetch all transactions for YTD with splits
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

    // Calculate YTD spending by category
    // For expenses: add to spending
    // For income: subtract from spending (refunds, etc.)
    const spendingByCategory: Record<number, number> = {};

    transactions?.forEach((transaction: any) => {
      transaction.splits?.forEach((split: any) => {
        const categoryId = split.category_id;
        const amount = split.amount;
        
        if (!spendingByCategory[categoryId]) {
          spendingByCategory[categoryId] = 0;
        }
        
        // Expenses add to spending, income subtracts from spending
        if (transaction.transaction_type === 'expense') {
          spendingByCategory[categoryId] += amount;
        } else if (transaction.transaction_type === 'income') {
          spendingByCategory[categoryId] -= amount;
        }
      });
    });

    return NextResponse.json(spendingByCategory);
  } catch (error) {
    console.error('Error in ytd-spending:', error);
    return NextResponse.json(
      { error: 'Failed to calculate YTD spending' },
      { status: 500 }
    );
  }
}

