import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const accountId = parseInt(id);
    
    if (isNaN(accountId)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    const { supabase } = await getAuthenticatedUser();
    const budgetAccountId = await getActiveAccountId();
    
    if (!budgetAccountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    // Fetch all audit records for this account, ordered by date
    const { data: auditRecords, error: auditError } = await supabase
      .from('account_balance_audit')
      .select('created_at, new_balance')
      .eq('account_id', accountId)
      .eq('budget_account_id', budgetAccountId)
      .order('created_at', { ascending: true });

    if (auditError) {
      console.error('Error fetching balance history:', auditError);
      return NextResponse.json(
        { error: 'Failed to fetch balance history' },
        { status: 500 }
      );
    }

    return NextResponse.json(auditRecords || []);
  } catch (error: any) {
    console.error('Error in balance history endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch balance history' },
      { status: 500 }
    );
  }
}
