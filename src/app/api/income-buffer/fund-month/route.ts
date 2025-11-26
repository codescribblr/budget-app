import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/income-buffer/fund-month
 * Transfer funds from Income Buffer to available funds (reduces buffer balance)
 * Body: { amount: number }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

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
      .eq('user_id', user.id)
      .eq('name', 'Income Buffer')
      .eq('is_system', true)
      .single();

    if (categoryError || !bufferCategory) {
      return NextResponse.json(
        { error: 'Income Buffer category not found. Please disable and re-enable the feature.' },
        { status: 404 }
      );
    }

    // Check if buffer has enough funds
    if (bufferCategory.current_balance < amount) {
      return NextResponse.json(
        { 
          error: 'Insufficient funds in buffer',
          available: bufferCategory.current_balance,
          requested: amount,
        },
        { status: 400 }
      );
    }

    // Reduce the buffer category balance
    const newBalance = bufferCategory.current_balance - amount;
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
        { error: 'Failed to withdraw funds from buffer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newBalance,
      amountWithdrawn: amount,
    });
  } catch (error: any) {
    console.error('Error in POST /api/income-buffer/fund-month:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

