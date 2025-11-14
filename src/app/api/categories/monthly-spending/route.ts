import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/categories/monthly-spending
 * Returns current month's spending for each category
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        splits:transaction_splits(
          category_id,
          amount
        )
      `)
      .eq('user_id', user.id)
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
    const spendingByCategory: Record<number, number> = {};

    transactions?.forEach((transaction: any) => {
      transaction.splits?.forEach((split: any) => {
        const categoryId = split.category_id;
        const amount = split.amount;
        
        if (!spendingByCategory[categoryId]) {
          spendingByCategory[categoryId] = 0;
        }
        spendingByCategory[categoryId] += amount;
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

