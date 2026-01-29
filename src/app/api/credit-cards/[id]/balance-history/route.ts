import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const creditCardId = parseInt(id);
    
    if (isNaN(creditCardId)) {
      return NextResponse.json({ error: 'Invalid credit card ID' }, { status: 400 });
    }

    const { supabase } = await getAuthenticatedUser();
    const budgetAccountId = await getActiveAccountId();
    
    if (!budgetAccountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    // Fetch credit card to get limit
    const { data: creditCard } = await supabase
      .from('credit_cards')
      .select('credit_limit')
      .eq('id', creditCardId)
      .eq('account_id', budgetAccountId)
      .single();

    // Fetch all audit records for this credit card, ordered by date
    const { data: auditRecords, error: auditError } = await supabase
      .from('credit_card_balance_audit')
      .select('created_at, new_available_credit')
      .eq('credit_card_id', creditCardId)
      .eq('budget_account_id', budgetAccountId)
      .order('created_at', { ascending: true });

    if (auditError) {
      console.error('Error fetching balance history:', auditError);
      return NextResponse.json(
        { error: 'Failed to fetch balance history' },
        { status: 500 }
      );
    }

    // Transform to include balance (limit - available_credit)
    const creditLimit = creditCard?.credit_limit || 0;
    const records = (auditRecords || []).map((record: any) => ({
      ...record,
      new_balance: creditLimit - (record.new_available_credit || 0),
    }));

    return NextResponse.json(records);
  } catch (error: any) {
    console.error('Error in balance history endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch balance history' },
      { status: 500 }
    );
  }
}
