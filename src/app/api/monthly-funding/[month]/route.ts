import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';

/**
 * GET /api/monthly-funding/[month]
 * Get funding status for all categories for a specific month
 * Month format: YYYY-MM-DD (first day of month, e.g., '2025-11-01')
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ month: string }> }
) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { month } = await params;

    // Validate month format (YYYY-MM-DD)
    const monthDate = new Date(month);
    if (isNaN(monthDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid month format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Get all categories for the user
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name, monthly_amount, current_balance, sort_order')
      .eq('account_id', accountId)
      .order('sort_order');

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    // Get monthly funding records for this month
    const { data: fundingRecords, error: fundingError } = await supabase
      .from('category_monthly_funding')
      .select('category_id, target_amount, funded_amount')
      .eq('account_id', accountId)
      .eq('month', month);

    if (fundingError) {
      console.error('Error fetching monthly funding:', fundingError);
      return NextResponse.json(
        { error: 'Failed to fetch monthly funding' },
        { status: 500 }
      );
    }

    // Build response with funding status for each category
    const categoriesWithFunding = categories.map(category => {
      const funding = fundingRecords?.find(f => f.category_id === category.id);
      const targetAmount = funding?.target_amount || category.monthly_amount || 0;
      const fundedAmount = funding?.funded_amount || 0;
      const fundingPercentage = targetAmount > 0 
        ? Math.round((fundedAmount / targetAmount) * 100)
        : 0;

      return {
        categoryId: category.id,
        categoryName: category.name,
        currentBalance: category.current_balance,
        targetAmount,
        fundedAmount,
        remainingToFund: Math.max(0, targetAmount - fundedAmount),
        fundingPercentage,
        fullyFunded: fundedAmount >= targetAmount,
      };
    });

    // Calculate summary
    const totalTarget = categoriesWithFunding.reduce((sum, c) => sum + c.targetAmount, 0);
    const totalFunded = categoriesWithFunding.reduce((sum, c) => sum + c.fundedAmount, 0);
    const totalRemaining = Math.max(0, totalTarget - totalFunded);
    const overallPercentage = totalTarget > 0 
      ? Math.round((totalFunded / totalTarget) * 100)
      : 0;

    return NextResponse.json({
      month,
      categories: categoriesWithFunding,
      summary: {
        totalTarget,
        totalFunded,
        totalRemaining,
        fundingPercentage: overallPercentage,
        categoriesFullyFunded: categoriesWithFunding.filter(c => c.fullyFunded).length,
        totalCategories: categoriesWithFunding.length,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/monthly-funding/[month]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

