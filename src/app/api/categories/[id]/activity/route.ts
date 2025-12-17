import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';

/**
 * GET /api/categories/[id]/activity
 * Lightweight per-category activity summary for management UI.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
    }

    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    // Current month range (YYYY-MM-DD)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    // Last activity: newest transaction date that references this category
    const { data: lastSplit, error: lastError } = await supabase
      .from('transaction_splits')
      .select('transactions!inner(date, budget_account_id)')
      .eq('category_id', categoryId)
      .eq('transactions.budget_account_id', accountId)
      .order('date', { ascending: false, referencedTable: 'transactions' })
      .limit(1)
      .maybeSingle();

    if (lastError) throw lastError;

    // Count transactions this month for this category
    const { count, error: countError } = await supabase
      .from('transaction_splits')
      .select('id, transactions!inner(id, date, budget_account_id)', { count: 'exact', head: true })
      .eq('category_id', categoryId)
      .eq('transactions.budget_account_id', accountId)
      .gte('transactions.date', startDate)
      .lte('transactions.date', endDate);

    if (countError) throw countError;

    const lastTransactionDate = (lastSplit as any)?.transactions?.date ?? null;

    return NextResponse.json({
      lastTransactionDate,
      monthTransactionCount: count ?? 0,
    });
  } catch (error: any) {
    console.error('Error fetching category activity:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch category activity' }, { status: 500 });
  }
}

