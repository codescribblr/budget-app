import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';

/**
 * GET /api/test/recurring-analysis/account
 * Find the account with the most transactions for analysis
 */
export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    // Get all accounts the user has access to
    const { data: accountUsers, error: accountUsersError } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (accountUsersError) throw accountUsersError;

    if (!accountUsers || accountUsers.length === 0) {
      return NextResponse.json({ error: 'No accounts found' }, { status: 404 });
    }

    const accountIds = accountUsers.map(au => au.account_id);

    // Count transactions per account using SQL aggregation
    // We'll query each account to get accurate counts
    const accountCounts: Array<{ accountId: number; count: number }> = [];
    
    for (const accountId of accountIds) {
      const { count, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('budget_account_id', accountId);

      if (countError) {
        console.error(`Error counting transactions for account ${accountId}:`, countError);
        continue;
      }

      accountCounts.push({
        accountId,
        count: count || 0,
      });
    }

    // Find account with most transactions
    if (accountCounts.length === 0) {
      return NextResponse.json({ error: 'No transactions found' }, { status: 404 });
    }

    accountCounts.sort((a, b) => b.count - a.count);
    const accountWithMost = accountCounts[0];
    
    if (accountWithMost.count === 0) {
      return NextResponse.json({ error: 'No transactions found' }, { status: 404 });
    }

    const accountIdWithMost = accountWithMost.accountId;
    const maxCount = accountWithMost.count;

    // Get account details
    const { data: account, error: accountError } = await supabase
      .from('budget_accounts')
      .select('id, name, owner_id')
      .eq('id', accountIdWithMost)
      .single();

    if (accountError) throw accountError;

    return NextResponse.json({
      accountId: accountIdWithMost,
      accountName: account.name,
      transactionCount: maxCount,
      ownerId: account.owner_id,
      allAccountCounts: accountCounts, // Include all counts for debugging
    });
  } catch (error: any) {
    console.error('Error finding account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to find account' },
      { status: 500 }
    );
  }
}
