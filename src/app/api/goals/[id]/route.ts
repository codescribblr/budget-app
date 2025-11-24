import { NextRequest, NextResponse } from 'next/server';
import { getGoalById, updateGoal, deleteGoal, getAuthenticatedUser } from '@/lib/supabase-queries';
import { validateUpdateGoal } from '@/lib/goals/validations';
import { requirePremiumSubscription, PremiumRequiredError } from '@/lib/subscription-utils';
import type { UpdateGoalRequest, Goal } from '@/lib/types';

/**
 * GET /api/goals/[id]
 * Get a single goal by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser();
    await requirePremiumSubscription(user.id);

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
    
    return NextResponse.json(goal);
  } catch (error: any) {
    if (error instanceof PremiumRequiredError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Error fetching goal:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch goal', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/goals/[id]
 * Update a goal
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser();
    await requirePremiumSubscription(user.id);

    const { id } = await params;
    const goalId = parseInt(id);
    
    if (isNaN(goalId)) {
      return NextResponse.json(
        { error: 'Invalid goal ID' },
        { status: 400 }
      );
    }
    
    const data: UpdateGoalRequest = await request.json();
    
    // Get current goal to validate
    const currentGoal = await getGoalById(goalId);
    if (!currentGoal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }
    
    // Validate update
    const validation = validateUpdateGoal(
      currentGoal as Goal,
      data,
      currentGoal.current_balance || 0
    );
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    if (validation.warning) {
      // Return warning but allow update (client can show warning)
      const goal = await updateGoal(goalId, data);
      return NextResponse.json({
        goal,
        warning: validation.warning,
      });
    }
    
    const goal = await updateGoal(goalId, data);
    return NextResponse.json(goal);
  } catch (error: any) {
    if (error instanceof PremiumRequiredError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Error updating goal:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to update goal', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/goals/[id]
 * Delete a goal
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser();
    await requirePremiumSubscription(user.id);

    const { id } = await params;
    const goalId = parseInt(id);
    
    if (isNaN(goalId)) {
      return NextResponse.json(
        { error: 'Invalid goal ID' },
        { status: 400 }
      );
    }
    
    // Check if should delete category
    const deleteCategoryParam = request.nextUrl.searchParams.get('deleteCategory');
    const deleteCategory = deleteCategoryParam === 'true';
    
    await deleteGoal(goalId, deleteCategory);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof PremiumRequiredError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Error deleting goal:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle partial success (goal deleted but category deletion failed)
    if (error.partialSuccess) {
      return NextResponse.json({
        error: error.message,
        partialSuccess: true,
        goalDeleted: true,
        categoryId: error.categoryId,
        categoryName: error.categoryName,
        categoryError: error.categoryError,
      }, { status: 207 }); // 207 Multi-Status indicates partial success
    }

    return NextResponse.json(
      { error: 'Failed to delete goal', message: error.message },
      { status: 500 }
    );
  }
}

