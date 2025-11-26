import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recordMonthlyFunding, isFeatureEnabled } from '@/lib/supabase-queries';

/**
 * POST /api/allocations/batch
 * Batch allocate funds to multiple categories in a single request
 * Body: { 
 *   allocations: Array<{ categoryId: number, amount: number }>,
 *   month?: string 
 * }
 */
export async function POST(request: NextRequest) {
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
    const { allocations, month } = body;

    // Validate input
    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      return NextResponse.json(
        { error: 'Invalid allocations array' },
        { status: 400 }
      );
    }

    // Validate each allocation
    for (const allocation of allocations) {
      if (!allocation.categoryId || typeof allocation.categoryId !== 'number') {
        return NextResponse.json(
          { error: 'Invalid categoryId in allocation' },
          { status: 400 }
        );
      }
      if (!allocation.amount || typeof allocation.amount !== 'number' || allocation.amount <= 0) {
        return NextResponse.json(
          { error: 'Invalid amount in allocation. Must be a positive number' },
          { status: 400 }
        );
      }
    }

    // Default to current month if not provided
    const allocationMonth = month || new Date().toISOString().slice(0, 7) + '-01';

    // Get all categories in one query
    const categoryIds = allocations.map(a => a.categoryId);
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('id, name, current_balance, monthly_amount')
      .in('id', categoryIds)
      .eq('user_id', user.id);

    if (categoryError) {
      console.error('Error fetching categories:', categoryError);
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    if (!categories || categories.length !== allocations.length) {
      return NextResponse.json(
        { error: 'One or more categories not found' },
        { status: 404 }
      );
    }

    // Create a map for quick lookup
    const categoryMap = new Map(categories.map(cat => [cat.id, cat]));

    // Update each category balance individually
    // Note: We can't use a single batch update because Supabase doesn't support
    // updating multiple rows with different values in one query
    const updatePromises = allocations.map(async (allocation) => {
      const category = categoryMap.get(allocation.categoryId);
      if (!category) {
        throw new Error(`Category ${allocation.categoryId} not found`);
      }
      const newBalance = (category.current_balance || 0) + allocation.amount;

      return supabase
        .from('categories')
        .update({
          current_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', allocation.categoryId)
        .eq('user_id', user.id);
    });

    // Execute all updates in parallel
    const updateResults = await Promise.all(updatePromises);

    // Check for any errors
    const updateError = updateResults.find(result => result.error);
    if (updateError?.error) {
      console.error('Error updating category balances:', updateError.error);
      return NextResponse.json(
        { error: 'Failed to update category balances' },
        { status: 500 }
      );
    }

    // Record monthly funding if feature is enabled
    let fundingTracked = false;
    try {
      const monthlyFundingEnabled = await isFeatureEnabled('monthly_funding_tracking');
      if (monthlyFundingEnabled) {
        // Record funding for each allocation
        await Promise.all(
          allocations.map(allocation => {
            const category = categoryMap.get(allocation.categoryId);
            return recordMonthlyFunding(
              allocation.categoryId,
              allocationMonth,
              allocation.amount,
              category?.monthly_amount || 0
            );
          })
        );
        fundingTracked = true;
      }
    } catch (fundingError) {
      console.error('Error recording monthly funding:', fundingError);
      // Don't fail the request if funding tracking fails
    }

    return NextResponse.json({
      success: true,
      allocationsProcessed: allocations.length,
      totalAmount: allocations.reduce((sum, a) => sum + a.amount, 0),
      month: allocationMonth,
      fundingTracked,
    });
  } catch (error: any) {
    console.error('Error in POST /api/allocations/batch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

