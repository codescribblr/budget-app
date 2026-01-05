import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';

/**
 * GET /api/income-buffer/status
 * Get Income Buffer status including balance, months of runway, and funding status
 */
export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    // Check if Income Buffer feature is enabled
    const { data: featureFlag } = await supabase
      .from('user_feature_flags')
      .select('enabled')
      .eq('user_id', user.id)
      .eq('feature_name', 'income_buffer')
      .single();

    if (!featureFlag || !featureFlag.enabled) {
      return NextResponse.json({
        enabled: false,
        balance: 0,
        monthsOfRunway: 0,
        monthlyBudget: 0,
      });
    }

    // Find the Income Buffer category
    const { data: bufferCategory } = await supabase
      .from('categories')
      .select('id, current_balance')
      .eq('user_id', user.id)
      .eq('name', 'Income Buffer')
      .eq('is_system', true)
      .single();

    if (!bufferCategory) {
      return NextResponse.json({
        enabled: true,
        balance: 0,
        monthsOfRunway: 0,
        monthlyBudget: 0,
        error: 'Income Buffer category not found',
      });
    }

    // Calculate total monthly budget (sum of all non-system, non-buffer categories)
    const { data: categories } = await supabase
      .from('categories')
      .select('monthly_amount')
      .eq('user_id', user.id)
      .eq('is_system', false);

    const monthlyBudget = categories?.reduce((sum, cat) => sum + (cat.monthly_amount || 0), 0) || 0;
    const monthsOfRunway = monthlyBudget > 0 ? bufferCategory.current_balance / monthlyBudget : 0;

    // Check if current month has been funded
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    const { data: fundingData } = await supabase
      .from('category_monthly_funding')
      .select('funded_amount')
      .eq('user_id', user.id)
      .eq('month', currentMonth);

    const totalFundedThisMonth = fundingData?.reduce((sum, f) => sum + (f.funded_amount || 0), 0) || 0;
    const hasBeenFundedThisMonth = totalFundedThisMonth > 0;

    return NextResponse.json({
      enabled: true,
      balance: bufferCategory.current_balance,
      monthsOfRunway: Math.round(monthsOfRunway * 10) / 10, // Round to 1 decimal
      monthlyBudget,
      hasBeenFundedThisMonth,
      totalFundedThisMonth,
    });
  } catch (error: any) {
    console.error('Error in GET /api/income-buffer/status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


