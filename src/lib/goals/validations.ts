import type { CreateGoalRequest, UpdateGoalRequest, Goal } from '@/lib/types';
import { localDate } from '@/lib/new-look';

function validTargetDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime()) && localDate(date) === value && value >= localDate();
}

/**
 * Validate goal creation request
 */
export function validateCreateGoal(data: CreateGoalRequest): { valid: boolean; error?: string } {
  if (!data.name || data.name.trim().length === 0) {
    return { valid: false, error: 'Goal name is required' };
  }
  
  if (data.name.length > 255) {
    return { valid: false, error: 'Goal name must be 255 characters or less' };
  }
  
  // Target amount validation (not required for debt-paydown, will be set from credit card/loan)
  if (data.goal_type !== 'debt-paydown') {
    if (!data.target_amount || data.target_amount <= 0) {
      return { valid: false, error: 'Target amount must be greater than 0' };
    }
  }
  
  if (data.target_date) {
    if (!validTargetDate(data.target_date)) {
      return { valid: false, error: 'Target date must be today or a future date' };
    }
  }
  
  if (data.goal_type === 'envelope') {
    if (data.monthly_contribution === undefined || data.monthly_contribution === null || data.monthly_contribution < 0) {
      return { valid: false, error: 'Monthly contribution must be 0 or greater for envelope goals' };
    }
    if (data.linked_account_id) {
      return { valid: false, error: 'Envelope goals cannot be linked to an account' };
    }
    if (data.linked_credit_card_id) {
      return { valid: false, error: 'Envelope goals cannot be linked to a credit card' };
    }
    if (data.linked_loan_id) {
      return { valid: false, error: 'Envelope goals cannot be linked to a loan' };
    }
  }
  
  if (data.goal_type === 'account-linked') {
    // Monthly contribution is required for all goals (can be 0)
    if (data.monthly_contribution === undefined || data.monthly_contribution === null || data.monthly_contribution < 0) {
      return { valid: false, error: 'Monthly contribution must be 0 or greater for account-linked goals' };
    }
    // Must have either an existing account or create a new one
    if (!data.linked_account_id && !data.new_account_name) {
      return { valid: false, error: 'Account-linked goals must have a linked account or create a new account' };
    }
    // Cannot have both
    if (data.linked_account_id && data.new_account_name) {
      return { valid: false, error: 'Cannot specify both an existing account and create a new account' };
    }
    // If creating new account, name is required
    if (data.new_account_name && !data.new_account_name.trim()) {
      return { valid: false, error: 'Account name is required when creating a new account' };
    }
    if (data.starting_balance !== undefined) {
      return { valid: false, error: 'Account-linked goals cannot have a starting balance' };
    }
    if (data.linked_credit_card_id) {
      return { valid: false, error: 'Account-linked goals cannot be linked to a credit card' };
    }
    if (data.linked_loan_id) {
      return { valid: false, error: 'Account-linked goals cannot be linked to a loan' };
    }
  }
  
  if (data.goal_type === 'debt-paydown') {
    if (!data.linked_credit_card_id && !data.linked_loan_id) {
      return { valid: false, error: 'Debt paydown goals must be linked to a credit card or loan' };
    }
    if (data.linked_credit_card_id && data.linked_loan_id) {
      return { valid: false, error: 'Debt paydown goals cannot be linked to both a credit card and a loan' };
    }
    if (data.monthly_contribution === undefined || data.monthly_contribution === null || data.monthly_contribution < 0) {
      return { valid: false, error: 'Monthly contribution must be 0 or greater for debt paydown goals' };
    }
    if (data.linked_account_id) {
      return { valid: false, error: 'Debt paydown goals cannot be linked to an account' };
    }
    if (data.linked_category_id) {
      return { valid: false, error: 'Debt paydown goals cannot be linked to a category' };
    }
    if (data.starting_balance !== undefined) {
      return { valid: false, error: 'Debt paydown goals cannot have a starting balance (it is set from credit card/loan balance)' };
    }
  }
  
  return { valid: true };
}

/**
 * Validate goal update request
 */
export function validateUpdateGoal(
  goal: Goal,
  data: UpdateGoalRequest,
  _currentBalance: number
): { valid: boolean; error?: string; warning?: string } {
  if (data.name !== undefined && data.name.trim().length === 0) {
    return { valid: false, error: 'Goal name cannot be empty' };
  }
  
  if (data.target_amount !== undefined && data.target_amount <= 0) {
    return { valid: false, error: 'Target amount must be greater than 0' };
  }
  
  if (data.target_date !== undefined && data.target_date !== null) {
    if (!validTargetDate(data.target_date)) {
      return { valid: false, error: 'Target date must be today or a future date' };
    }
  }
  
  if (data.monthly_contribution !== undefined && data.monthly_contribution < 0) {
    return { valid: false, error: 'Monthly contribution cannot be negative' };
  }
  
  // Account-linked goals must have a linked account
  if (goal.goal_type === 'account-linked' && data.linked_account_id !== undefined && !data.linked_account_id) {
    return { valid: false, error: 'Account-linked goals must have a linked account' };
  }
  
  // Goal type is immutable in UpdateGoalRequest. Ordinary edits to a funded
  // envelope do not change its type and must not produce a type-change warning.
  
  return { valid: true };
}

/**
 * Check if account can be linked to goal
 */
export function canLinkAccount(accountId: number | null, existingLinkedAccountId: number | null): boolean {
  if (!accountId) return false;
  if (existingLinkedAccountId && existingLinkedAccountId !== accountId) {
    return false; // Account already linked to different goal
  }
  return true;
}


