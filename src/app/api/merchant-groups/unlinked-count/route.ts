import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';

/**
 * Get count of transactions that can be linked (have merchant mappings but no merchant_group_id)
 */
export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ count: 0 });
    }

    // Get all transactions without merchant_group_id
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('id, description')
      .eq('budget_account_id', accountId)
      .is('merchant_group_id', null);

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return NextResponse.json(
        { error: 'Failed to count unlinked transactions' },
        { status: 500 }
      );
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    // Check which transactions have merchant mappings
    // We need to check if any of these transaction descriptions have mappings
    const descriptions = transactions.map(t => t.description);
    
    // Get all merchant mappings for this account
    const { data: mappings, error: mappingsError } = await supabase
      .from('merchant_mappings')
      .select('pattern')
      .eq('account_id', accountId)
      .not('merchant_group_id', 'is', null);

    if (mappingsError) {
      console.error('Error fetching merchant mappings:', mappingsError);
      return NextResponse.json(
        { error: 'Failed to count unlinked transactions' },
        { status: 500 }
      );
    }

    // Create a set of mapped patterns for quick lookup
    const mappedPatterns = new Set(mappings?.map(m => m.pattern) || []);

    // Count transactions that have mappings
    const linkableCount = transactions.filter(t => mappedPatterns.has(t.description)).length;

    return NextResponse.json({
      count: linkableCount,
    });
  } catch (error) {
    console.error('Error in unlinked-count:', error);
    return NextResponse.json(
      { error: 'Failed to count unlinked transactions' },
      { status: 500 }
    );
  }
}

