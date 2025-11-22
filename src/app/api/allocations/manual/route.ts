import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recordMonthlyFunding, isFeatureEnabled } from '@/lib/supabase-queries';

/**
 * POST /api/allocations/manual
 * Manually allocate funds to a category
 * Body: { categoryId: number, amount: number, month?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { categoryId, amount, month } = body;

    // Validate input
    if (!categoryId || typeof categoryId !== 'number') {
      return NextResponse.json(
        { error: 'Invalid categoryId' },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number' },
        { status: 400 }
      );
    }

    // Default to current month if not provided
    const allocationMonth = month || new Date().toISOString().slice(0, 7) + '-01';

    // Get the category
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, name, current_balance, monthly_amount')
      .eq('id', categoryId)
      .eq('user_id', user.id)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Update category balance
    const newBalance = (category.current_balance || 0) + amount;
    const { error: updateError } = await supabase
      .from('categories')
      .update({ 
        current_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', categoryId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating category balance:', updateError);
      return NextResponse.json(
        { error: 'Failed to update category balance' },
        { status: 500 }
      );
    }

    // Record monthly funding if feature is enabled
    let fundingTracked = false;
    try {
      const monthlyFundingEnabled = await isFeatureEnabled('monthly_funding_tracking');
      if (monthlyFundingEnabled) {
        await recordMonthlyFunding(
          categoryId,
          allocationMonth,
          amount,
          category.monthly_amount
        );
        fundingTracked = true;
      }
    } catch (fundingError) {
      console.error('Error recording monthly funding:', fundingError);
      // Don't fail the request if funding tracking fails
    }

    // Get updated category
    const { data: updatedCategory } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    return NextResponse.json({
      success: true,
      category: updatedCategory,
      allocation: {
        amount,
        month: allocationMonth,
        fundingTracked,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/allocations/manual:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

