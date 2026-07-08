import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { recordMonthlyFunding, isFeatureEnabled } from '@/lib/supabase-queries';
import { checkWriteAccess } from '@/lib/api-helpers';
import { logBalanceChange, logBalanceChanges } from '@/lib/audit/category-balance-audit';

/**
 * POST /api/allocations/batch
 * Batch allocate funds to multiple categories in a single request
 * Body: { 
 *   allocations: Array<{ categoryId: number, amount: number }>,
 *   month?: string,
 *   bufferWithdrawAmount?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const body = await request.json();
    const { allocations, month, bufferWithdrawAmount } = body;

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

    let bufferWithdrawn = 0;
    let bufferCategoryId: number | null = null;
    let bufferBalanceBeforeWithdraw: number | null = null;

    if (bufferWithdrawAmount !== undefined && bufferWithdrawAmount !== null) {
      if (typeof bufferWithdrawAmount !== 'number' || bufferWithdrawAmount <= 0) {
        return NextResponse.json(
          { error: 'Invalid bufferWithdrawAmount. Must be a positive number' },
          { status: 400 }
        );
      }

      const incomeBufferEnabled = await isFeatureEnabled('income_buffer');
      if (!incomeBufferEnabled) {
        return NextResponse.json(
          { error: 'Income Buffer feature is not enabled' },
          { status: 403 }
        );
      }

      const { data: bufferCategory, error: bufferError } = await supabase
        .from('categories')
        .select('id, current_balance')
        .eq('account_id', accountId)
        .eq('name', 'Income Buffer')
        .eq('is_system', true)
        .single();

      if (bufferError || !bufferCategory) {
        return NextResponse.json(
          { error: 'Income Buffer category not found' },
          { status: 404 }
        );
      }

      if (bufferCategory.current_balance < bufferWithdrawAmount) {
        return NextResponse.json(
          {
            error: 'Insufficient funds in buffer',
            available: bufferCategory.current_balance,
            requested: bufferWithdrawAmount,
          },
          { status: 400 }
        );
      }

      bufferCategoryId = bufferCategory.id;
      bufferBalanceBeforeWithdraw = bufferCategory.current_balance;
      const newBufferBalance = bufferCategory.current_balance - bufferWithdrawAmount;

      const { error: bufferUpdateError } = await supabase
        .from('categories')
        .update({
          current_balance: newBufferBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bufferCategory.id);

      if (bufferUpdateError) {
        console.error('Error withdrawing from buffer:', bufferUpdateError);
        return NextResponse.json(
          { error: 'Failed to withdraw funds from buffer' },
          { status: 500 }
        );
      }

      await logBalanceChange(
        bufferCategory.id,
        bufferCategory.current_balance,
        newBufferBalance,
        'income_buffer_fund',
        { source: 'allocation_batch' }
      );

      bufferWithdrawn = bufferWithdrawAmount;
    }

    // Get all categories in one query
    const categoryIds = allocations.map(a => a.categoryId);
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('id, name, current_balance, monthly_amount')
      .in('id', categoryIds)
      .eq('account_id', accountId);

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
      const oldBalance = category.current_balance || 0;
      const newBalance = oldBalance + allocation.amount;

      return supabase
        .from('categories')
        .update({
          current_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', allocation.categoryId)
        .eq('account_id', accountId);
    });

    // Execute all updates in parallel
    const updateResults = await Promise.all(updatePromises);

    // Check for any errors
    const updateError = updateResults.find(result => result.error);
    if (updateError?.error) {
      console.error('Error updating category balances:', updateError.error);

      // Restore buffer balance if allocation failed after a buffer withdrawal
      if (bufferWithdrawn > 0 && bufferCategoryId !== null && bufferBalanceBeforeWithdraw !== null) {
        const { error: revertError } = await supabase
          .from('categories')
          .update({
            current_balance: bufferBalanceBeforeWithdraw,
            updated_at: new Date().toISOString(),
          })
          .eq('id', bufferCategoryId);

        if (revertError) {
          console.error('Error reverting buffer withdrawal after failed allocation:', revertError);
        } else {
          await logBalanceChange(
            bufferCategoryId,
            bufferBalanceBeforeWithdraw - bufferWithdrawn,
            bufferBalanceBeforeWithdraw,
            'income_buffer_fund',
            { source: 'allocation_batch_revert' }
          );
        }
      }

      return NextResponse.json(
        { error: 'Failed to update category balances' },
        { status: 500 }
      );
    }

    // Log balance changes
    await logBalanceChanges(
      allocations.map(allocation => {
        const category = categoryMap.get(allocation.categoryId);
        return {
          categoryId: allocation.categoryId,
          oldBalance: category?.current_balance || 0,
          newBalance: (category?.current_balance || 0) + allocation.amount,
          changeType: 'allocation_batch' as const,
          metadata: {
            allocation_month: allocationMonth,
          },
        };
      })
    );

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
      bufferWithdrawn,
    });
  } catch (error: any) {
    console.error('Error in POST /api/allocations/batch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


