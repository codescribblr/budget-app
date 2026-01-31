import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';

/**
 * GET /api/test/recurring-analysis/transactions?accountId=X
 * Fetch all transactions for an account for analysis
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 });
    }

    // Verify user has access to this account
    const { data: accountUser } = await supabase
      .from('account_users')
      .select('*')
      .eq('account_id', parseInt(accountId))
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!accountUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch all transactions with pagination (Supabase has 1000 row limit)
    const PAGE_SIZE = 1000;
    const allTransactions: any[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const offset = page * PAGE_SIZE;
      
      const { data: transactions, error, count } = await supabase
        .from('transactions')
        .select(`
          id,
          date,
          total_amount,
          transaction_type,
          merchant_group_id,
          account_id,
          credit_card_id,
          merchant_groups (
            display_name
          )
        `, { count: 'exact' })
        .eq('budget_account_id', parseInt(accountId))
        .order('date', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      if (!transactions || transactions.length === 0) {
        hasMore = false;
        break;
      }

      allTransactions.push(...transactions);

      // Check if we've fetched all transactions
      const totalCount = count || 0;
      if (allTransactions.length >= totalCount || transactions.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return NextResponse.json({
      transactions: allTransactions,
      count: allTransactions.length,
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
