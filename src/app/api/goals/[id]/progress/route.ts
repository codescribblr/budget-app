import { NextRequest, NextResponse } from 'next/server';
import { getGoalById, getAuthenticatedUser } from '@/lib/supabase-queries';
import { calculateGoalProgress } from '@/lib/goals/calculations';
import { requirePremiumSubscription, PremiumRequiredError } from '@/lib/subscription-utils';
import { getActiveAccountId } from '@/lib/account-context';

/**
 * GET /api/goals/[id]/progress
 * Get detailed progress calculations for a goal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }
    await requirePremiumSubscription(accountId);

    const { id } = await params;
    const goalId = parseInt(id);
    
    if (isNaN(goalId)) {
      return NextResponse.json(
        { error: 'Invalid goal ID' },
        { status: 400 }
      );
    }
    
    const goal = await getGoalById(goalId);
    
    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }
    
    const progress = calculateGoalProgress(goal, goal.current_balance || 0);
    
    return NextResponse.json({
      goal: {
        id: goal.id,
        name: goal.name,
        target_amount: goal.target_amount,
        target_date: goal.target_date,
        monthly_contribution: goal.monthly_contribution,
        current_balance: goal.current_balance,
      },
      progress,
    });
  } catch (error: any) {
    if (error instanceof PremiumRequiredError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Error fetching goal progress:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch goal progress', message: error.message },
      { status: 500 }
    );
  }
}


