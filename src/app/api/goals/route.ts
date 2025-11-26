import { NextRequest, NextResponse } from 'next/server';
import { getAllGoals, createGoal, getAuthenticatedUser } from '@/lib/supabase-queries';
import { validateCreateGoal } from '@/lib/goals/validations';
import { requirePremiumSubscription, PremiumRequiredError } from '@/lib/subscription-utils';
import { getActiveAccountId } from '@/lib/account-context';
import type { CreateGoalRequest } from '@/lib/types';

/**
 * GET /api/goals
 * Get all goals for the authenticated user
 */
export async function GET(request: NextRequest) {
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

    const status = request.nextUrl.searchParams.get('status');
    const goals = await getAllGoals();

    // Filter by status if provided
    const filteredGoals = status
      ? goals.filter(g => g.status === status)
      : goals;

    return NextResponse.json(filteredGoals);
  } catch (error: any) {
    if (error instanceof PremiumRequiredError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Error fetching goals:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch goals', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/goals
 * Create a new goal
 */
export async function POST(request: NextRequest) {
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

    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const data: CreateGoalRequest = await request.json();

    // Validate request
    const validation = validateCreateGoal(data);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const goal = await createGoal(data);
    return NextResponse.json(goal, { status: 201 });
  } catch (error: any) {
    if (error instanceof PremiumRequiredError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Error creating goal:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Extract more specific error messages from database errors
    let errorMessage = 'Failed to create goal';
    if (error.code === '23502') {
      // NOT NULL constraint violation
      const columnMatch = error.message?.match(/column "(\w+)"/);
      if (columnMatch) {
        const columnName = columnMatch[1];
        const friendlyNames: Record<string, string> = {
          'monthly_contribution': 'Monthly contribution',
          'target_amount': 'Target amount',
          'name': 'Goal name',
        };
        errorMessage = `${friendlyNames[columnName] || columnName} is required`;
      } else {
        errorMessage = 'Required field is missing';
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

