import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';

/**
 * POST /api/income-buffer/add
 * Add funds to the Income Buffer category
 * Body: { amount: number }
 */
export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Check if Income Buffer feature is enabled
    const { data: featureFlag } = await supabase
      .from('user_feature_flags')
      .select('enabled')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .eq('feature_name', 'income_buffer')
      .single();

    if (!featureFlag || !featureFlag.enabled) {
      return NextResponse.json(
        { error: 'Income Buffer feature is not enabled' },
        { status: 403 }
      );
    }

    // Find the Income Buffer category
    const { data: bufferCategory, error: categoryError } = await supabase
      .from('categories')
      .select('id, current_balance')
      .eq('account_id', accountId)
      .eq('name', 'Income Buffer')
      .eq('is_system', true)
      .single();

    if (categoryError || !bufferCategory) {
      return NextResponse.json(
        { error: 'Income Buffer category not found. Please disable and re-enable the feature.' },
        { status: 404 }
      );
    }

    // Update the buffer category balance
    const newBalance = bufferCategory.current_balance + amount;
    const { error: updateError } = await supabase
      .from('categories')
      .update({ 
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', bufferCategory.id);

    if (updateError) {
      console.error('Error updating buffer balance:', updateError);
      return NextResponse.json(
        { error: 'Failed to add funds to buffer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newBalance,
      amountAdded: amount,
    });
  } catch (error: any) {
    console.error('Error in POST /api/income-buffer/add:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


