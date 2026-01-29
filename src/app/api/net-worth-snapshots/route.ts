import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await getAuthenticatedUser();
    const budgetAccountId = await getActiveAccountId();
    
    if (!budgetAccountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = supabase
      .from('net_worth_snapshots')
      .select('*')
      .eq('budget_account_id', budgetAccountId)
      .order('snapshot_date', { ascending: true });

    if (startDate) {
      query = query.gte('snapshot_date', startDate);
    }

    if (endDate) {
      query = query.lte('snapshot_date', endDate);
    }

    const { data: snapshots, error } = await query;

    if (error) {
      console.error('Error fetching net worth snapshots:', error);
      return NextResponse.json(
        { error: 'Failed to fetch net worth snapshots' },
        { status: 500 }
      );
    }

    return NextResponse.json(snapshots || []);
  } catch (error: any) {
    console.error('Error in net worth snapshots endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch net worth snapshots' },
      { status: 500 }
    );
  }
}
