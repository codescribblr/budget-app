import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';

/**
 * GET /api/categories/ytd-spending
 * Returns year-to-date spending for each category (from Jan 1 to today, inclusive)
 * 
 * Date range: January 1 of current calendar year through today (inclusive)
 * Calculation: Sums all transaction splits where:
 *   - Expenses: add amount to category spending
 *   - Income: subtract amount from category spending (for refunds, etc.)
 */
export async function GET() {
  try {
    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    // Get year-to-date date range (from Jan 1 to today, inclusive)
    const now = new Date();
    const year = now.getFullYear();
    const startDate = `${year}-01-01`;
    // Use end of today to ensure we include today's transactions
    const endDate = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // First, get all transaction IDs for YTD transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('id, transaction_type')
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

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({});
    }

    // Create a map of transaction_id -> transaction_type for quick lookup
    const transactionTypeMap = new Map<number, 'income' | 'expense'>();
    transactions.forEach((tx: any) => {
      transactionTypeMap.set(tx.id, tx.transaction_type);
    });

    // Get all splits for these transactions
    const transactionIds = transactions.map((tx: any) => tx.id);
    const { data: splits, error: splitsError } = await supabase
      .from('transaction_splits')
      .select('transaction_id, category_id, amount')
      .in('transaction_id', transactionIds);

    if (splitsError) {
      console.error('Error fetching transaction splits:', splitsError);
      return NextResponse.json(
        { error: 'Failed to fetch transaction splits' },
        { status: 500 }
      );
    }

    // Calculate YTD spending by category
    // For expenses: add to spending (amounts are stored as positive)
    // For income: subtract from spending (refunds, etc.)
    const spendingByCategory: Record<number, number> = {};

    splits?.forEach((split: any) => {
      const categoryId = split.category_id;
      const amount = Number(split.amount);
      const transactionType = transactionTypeMap.get(split.transaction_id);
      
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

    return NextResponse.json(spendingByCategory);
  } catch (error) {
    console.error('Error in ytd-spending:', error);
    return NextResponse.json(
      { error: 'Failed to calculate YTD spending' },
      { status: 500 }
    );
  }
}

