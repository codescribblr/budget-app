import type { CreateGoalRequest, UpdateGoalRequest, Goal } from '@/lib/types';

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
    const targetDate = new Date(data.target_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (targetDate < today) {
      return { valid: false, error: 'Target date must be in the future' };
    }
  }
  
  if (data.goal_type === 'envelope') {
    if (!data.monthly_contribution || data.monthly_contribution <= 0) {
      return { valid: false, error: 'Monthly contribution must be greater than 0 for envelope goals' };
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
    if (!data.monthly_contribution || data.monthly_contribution <= 0) {
      return { valid: false, error: 'Monthly contribution must be greater than 0 for debt paydown goals' };
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
  currentBalance: number
): { valid: boolean; error?: string; warning?: string } {
  if (data.name !== undefined && data.name.trim().length === 0) {
    return { valid: false, error: 'Goal name cannot be empty' };
  }
  
  if (data.target_amount !== undefined && data.target_amount <= 0) {
    return { valid: false, error: 'Target amount must be greater than 0' };
  }
  
  if (data.target_date !== undefined && data.target_date !== null) {
    const targetDate = new Date(data.target_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (targetDate < today) {
      return { valid: false, error: 'Target date must be in the future' };
    }
  }
  
  if (data.monthly_contribution !== undefined && data.monthly_contribution <= 0) {
    return { valid: false, error: 'Monthly contribution must be greater than 0' };
  }
  
  // Warn if changing goal type with existing balance
  if (goal.goal_type === 'envelope' && currentBalance > 0) {
    return {
      valid: true,
      warning: 'Changing goal type with existing balance may cause data inconsistencies. Consider creating a new goal instead.',
    };
  }
  
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

