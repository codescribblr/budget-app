import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';

const MONTH_PARAM = /^(\d{4})-(\d{2})$/;

function parseRequestedMonth(monthParam: string | null): { year: number; month: number } | null {
  if (!monthParam) return null;
  const m = MONTH_PARAM.exec(monthParam.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/**
 * GET /api/categories/monthly-spending
 * Returns spending per category for a month. Defaults to the current calendar month.
 * Optional query: month=YYYY-MM
 */
export async function GET(request: Request) {
  try {
    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const monthRaw = searchParams.get('month');
    const requested = parseRequestedMonth(monthRaw);
    if (monthRaw !== null && monthRaw !== '' && !requested) {
      return NextResponse.json({ error: 'Invalid month (use YYYY-MM)' }, { status: 400 });
    }

    let year: number;
    let monthIndex0: number; // 0–11

    if (requested) {
      year = requested.year;
      monthIndex0 = requested.month - 1;
    } else {
      const now = new Date();
      year = now.getFullYear();
      monthIndex0 = now.getMonth();
    }

    const month = String(monthIndex0 + 1).padStart(2, '0');
    const startDate = `${year}-${month}-01`;

    const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
    const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    // Fetch all transactions for the requested month with splits
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


