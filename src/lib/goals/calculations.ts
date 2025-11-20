import type { Goal, GoalProgress } from '@/lib/types';

/**
 * Calculate goal progress and tracking metrics
 */
export function calculateGoalProgress(goal: Goal, currentBalance: number): GoalProgress {
  const remaining_amount = Math.max(0, goal.target_amount - currentBalance);
  const progress_percentage = Math.min(100, (currentBalance / goal.target_amount) * 100);
  
  let months_remaining: number | null = null;
  let required_monthly_contribution: number = goal.monthly_contribution;
  let projected_completion_date: string | null = null;
  let is_on_track = true;
  
  if (goal.target_date) {
    const targetDate = new Date(goal.target_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const monthsDiff = daysDiff / 30.44; // Average days per month
    months_remaining = Math.max(0, Math.ceil(monthsDiff));
    
    if (months_remaining > 0) {
      required_monthly_contribution = remaining_amount / months_remaining;
      is_on_track = goal.monthly_contribution >= required_monthly_contribution;
    } else {
      months_remaining = 0;
      is_on_track = currentBalance >= goal.target_amount;
    }
  } else {
    // No target date - calculate projected completion
    if (goal.monthly_contribution > 0 && remaining_amount > 0) {
      const monthsNeeded = Math.ceil(remaining_amount / goal.monthly_contribution);
      const completionDate = new Date();
      completionDate.setMonth(completionDate.getMonth() + monthsNeeded);
      projected_completion_date = completionDate.toISOString().split('T')[0];
    }
    required_monthly_contribution = goal.monthly_contribution;
  }
  
  return {
    progress_percentage: Math.round(progress_percentage * 100) / 100,
    remaining_amount: Math.round(remaining_amount * 100) / 100,
    months_remaining,
    required_monthly_contribution: Math.round(required_monthly_contribution * 100) / 100,
    projected_completion_date,
    is_on_track,
  };
}

/**
 * Determine goal status based on balance and target date
 */
export function calculateGoalStatus(goal: Goal, currentBalance: number): Goal['status'] {
  if (goal.status === 'paused') {
    return 'paused';
  }
  
  if (currentBalance >= goal.target_amount) {
    return 'completed';
  }
  
  if (goal.target_date) {
    const targetDate = new Date(goal.target_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    
    if (targetDate < today && currentBalance < goal.target_amount) {
      return 'overdue';
    }
  }
  
  return 'active';
}

