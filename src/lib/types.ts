// Database types
export interface Category {
  id: number;
  name: string;
  monthly_amount: number;
  current_balance: number;
  sort_order: number;
  is_system: boolean;
  is_buffer?: boolean; // Income Buffer category - doesn't show in dropdowns but counts in totals
  is_goal?: boolean;
  is_archived?: boolean;
  notes?: string | null;
  // Variable income enhancement fields
  category_type?: 'monthly_expense' | 'accumulation' | 'target_balance';
  priority?: number; // 1-10, 1 is highest priority
  monthly_target?: number;
  annual_target?: number;
  target_balance?: number;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: number;
  name: string;
  balance: number;
  account_type: 'checking' | 'savings' | 'cash';
  include_in_totals: boolean;
  sort_order: number;
  linked_goal_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreditCard {
  id: number;
  name: string;
  credit_limit: number;
  available_credit: number;
  current_balance: number; // Calculated: credit_limit - available_credit
  include_in_totals: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: number;
  user_id: string;
  name: string;
  balance: number;
  interest_rate: number | null;
  minimum_payment: number | null;
  payment_due_date: number | null;
  open_date: string | null;
  starting_balance: number | null;
  institution: string | null;
  include_in_net_worth: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  date: string;
  description: string;
  total_amount: number; // Always positive
  transaction_type: 'income' | 'expense'; // NEW FIELD
  merchant_group_id?: number | null;
  account_id?: number | null;
  credit_card_id?: number | null;
  is_historical: boolean;
  created_at: string;
  updated_at: string;
}

export interface MerchantGroup {
  id: number;
  user_id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface MerchantMapping {
  id: number;
  user_id: string;
  merchant_group_id: number | null;
  pattern: string;
  normalized_pattern: string;
  is_automatic: boolean;
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

export interface MerchantGroupWithStats extends MerchantGroup {
  transaction_count: number;
  total_amount: number;
  unique_patterns: number;
  has_manual_mappings: boolean;
}

export interface MerchantCategoryRule {
  id: number;
  user_id: string;
  merchant_group_id: number | null;
  category_id: number;
  confidence_score: number;
  usage_count: number;
  last_used: string;
  pattern: string | null;
  normalized_pattern: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionSplit {
  id: number;
  transaction_id: number;
  category_id: number;
  amount: number;
  created_at: string;
}

export interface PendingCheck {
  id: number;
  description: string;
  amount: number;
  type: 'expense' | 'income';
  created_at: string;
  updated_at: string;
}

export interface Setting {
  id: number;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface PreTaxDeductionItem {
  id: string; // UUID for client-side management
  name: string;
  type: 'percentage' | 'fixed';
  value: number; // Percentage (e.g., 10 for 10%) or fixed amount per paycheck
}

// API request/response types
export interface CreateCategoryRequest {
  name: string;
  monthly_amount: number;
  current_balance?: number;
  sort_order?: number;
  notes?: string;
  is_system?: boolean;
  is_archived?: boolean;
  category_type?: 'monthly_expense' | 'accumulation' | 'target_balance';
  priority?: number;
  monthly_target?: number;
  annual_target?: number;
  target_balance?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  monthly_amount?: number;
  current_balance?: number;
  sort_order?: number;
  notes?: string;
  is_system?: boolean;
  is_archived?: boolean;
  category_type?: 'monthly_expense' | 'accumulation' | 'target_balance';
  priority?: number;
  monthly_target?: number;
  annual_target?: number;
  target_balance?: number;
}

export interface CreateAccountRequest {
  name: string;
  balance: number;
  account_type: 'checking' | 'savings' | 'cash';
  include_in_totals?: boolean;
  sort_order?: number;
}

export interface UpdateAccountRequest {
  name?: string;
  balance?: number;
  account_type?: 'checking' | 'savings' | 'cash';
  include_in_totals?: boolean;
  sort_order?: number;
}

export interface CreateCreditCardRequest {
  name: string;
  credit_limit: number;
  available_credit: number;
  include_in_totals?: boolean;
  sort_order?: number;
}

export interface UpdateCreditCardRequest {
  name?: string;
  credit_limit?: number;
  available_credit?: number;
  include_in_totals?: boolean;
  sort_order?: number;
}

export interface CreateTransactionRequest {
  date: string;
  description: string;
  transaction_type?: 'income' | 'expense'; // Optional, defaults to 'expense'
  is_historical?: boolean;
  account_id?: number | null;
  credit_card_id?: number | null;
  splits: {
    category_id: number;
    amount: number; // Always positive
  }[];
}

export interface UpdateTransactionRequest {
  date?: string;
  description?: string;
  transaction_type?: 'income' | 'expense'; // NEW FIELD
  merchant_group_id?: number | null;
  account_id?: number | null;
  credit_card_id?: number | null;
  splits?: {
    category_id: number;
    amount: number; // Always positive
  }[];
}

export interface CreatePendingCheckRequest {
  description: string;
  amount: number;
  type?: 'expense' | 'income';
}

export interface UpdatePendingCheckRequest {
  description?: string;
  amount?: number;
  type?: 'expense' | 'income';
}

export interface CreateLoanRequest {
  name: string;
  balance: number;
  interest_rate?: number;
  minimum_payment?: number;
  payment_due_date?: number;
  open_date?: string;
  starting_balance?: number;
  institution?: string;
  include_in_net_worth?: boolean;
}

export interface UpdateLoanRequest {
  name?: string;
  balance?: number;
  interest_rate?: number;
  minimum_payment?: number;
  payment_due_date?: number;
  open_date?: string;
  starting_balance?: number;
  institution?: string;
  include_in_net_worth?: boolean;
}

// View models with joined data
export interface TransactionWithSplits extends Transaction {
  splits: (TransactionSplit & { category_name: string })[];
  merchant_name?: string | null;
  account_name?: string | null;
  credit_card_name?: string | null;
}

export interface DuplicateTransaction {
  id: number;
  date: string;
  description: string;
  total_amount: number;
  transaction_type: 'income' | 'expense';
  merchant_group_id: number | null;
  is_historical: boolean;
  account_id: number | null;
  credit_card_id: number | null;
  created_at: string;
  splits: Array<{
    id: number;
    category_id: number;
    amount: number;
    category_name: string;
  }>;
}

export interface DuplicateGroup {
  amount: number;
  transactions: DuplicateTransaction[];
  isReviewed?: boolean; // Optional, for UI state
}

export interface MergeTransactionRequest {
  baseTransactionId: number;
  transactionsToMerge: number[];
  mergeData: {
    date: string; // Selected date
    description: string; // Selected description
    merchant_group_id: number | null;
    is_historical: boolean;
    transaction_type: 'income' | 'expense';
    splits: Array<{
      category_id: number;
      amount: number;
    }>;
  };
}

// Dashboard summary
export interface DashboardSummary {
  total_monies: number;
  total_envelopes: number;
  total_credit_card_balances: number;
  total_pending_checks: number;
  current_savings: number;
  has_negative_envelopes: boolean;
  monthly_net_income: number;
  total_monthly_budget: number;
}

// Goals
export interface Goal {
  id: number;
  user_id: string;
  name: string;
  target_amount: number; // For debt-paydown: starting debt amount (from credit card/loan balance at creation)
  target_date: string | null; // ISO date string or null
  goal_type: 'envelope' | 'account-linked' | 'debt-paydown';
  monthly_contribution: number;
  linked_account_id: number | null;
  linked_category_id: number | null;
  linked_credit_card_id: number | null; // For debt-paydown goals (credit cards)
  linked_loan_id: number | null; // For debt-paydown goals (loans)
  status: 'active' | 'completed' | 'overdue' | 'paused';
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Computed fields (not in DB)
  current_balance?: number; // For debt-paydown: credit card/loan balance (decreases as debt is paid)
  progress_percentage?: number; // For debt-paydown: (target_amount - current_balance) / target_amount * 100
  remaining_amount?: number; // For debt-paydown: current_balance (how much debt is left to pay)
  months_remaining?: number | null;
  required_monthly_contribution?: number;
  projected_completion_date?: string | null;
  is_on_track?: boolean;
}

export interface GoalWithDetails extends Goal {
  linked_account?: Account | null;
  linked_category?: Category | null;
  linked_credit_card?: CreditCard | null; // For debt-paydown goals (credit cards)
  linked_loan?: Loan | null; // For debt-paydown goals (loans)
}

export interface CreateGoalRequest {
  name: string;
  target_amount?: number; // For debt-paydown: captured automatically from credit card/loan balance at creation
  target_date?: string | null;
  goal_type: 'envelope' | 'account-linked' | 'debt-paydown';
  monthly_contribution: number;
  linked_account_id?: number | null;
  linked_category_id?: number | null; // For envelope goals (auto-created)
  linked_credit_card_id?: number | null; // For debt-paydown (credit cards)
  linked_loan_id?: number | null; // For debt-paydown (loans)
  starting_balance?: number; // For envelope goals
  notes?: string | null;
  // Fields for creating a new account (for account-linked goals)
  new_account_name?: string;
  new_account_type?: 'checking' | 'savings' | 'cash';
  new_account_balance?: number;
}

export interface UpdateGoalRequest {
  name?: string;
  target_amount?: number;
  target_date?: string | null;
  monthly_contribution?: number;
  status?: 'active' | 'completed' | 'overdue' | 'paused';
  notes?: string | null;
  sort_order?: number;
}

export interface GoalProgress {
  progress_percentage: number;
  remaining_amount: number;
  months_remaining: number | null;
  required_monthly_contribution: number;
  projected_completion_date: string | null;
  is_on_track: boolean;
}

