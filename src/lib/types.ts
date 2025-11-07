// Database types
export interface Category {
  id: number;
  name: string;
  monthly_amount: number;
  current_balance: number;
  sort_order: number;
  is_system: boolean;
  notes?: string | null;
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

export interface Transaction {
  id: number;
  date: string;
  description: string;
  total_amount: number;
  merchant_group_id?: number | null;
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
}

export interface UpdateCategoryRequest {
  name?: string;
  monthly_amount?: number;
  current_balance?: number;
  sort_order?: number;
  notes?: string;
  is_system?: boolean;
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
  splits: {
    category_id: number;
    amount: number;
  }[];
}

export interface UpdateTransactionRequest {
  date?: string;
  description?: string;
  merchant_group_id?: number | null;
  splits?: {
    category_id: number;
    amount: number;
  }[];
}

export interface CreatePendingCheckRequest {
  description: string;
  amount: number;
}

export interface UpdatePendingCheckRequest {
  description?: string;
  amount?: number;
}

// View models with joined data
export interface TransactionWithSplits extends Transaction {
  splits: (TransactionSplit & { category_name: string })[];
  merchant_name?: string | null;
}

// Dashboard summary
export interface DashboardSummary {
  total_monies: number;
  total_envelopes: number;
  total_credit_card_balances: number;
  total_pending_checks: number;
  current_savings: number;
  has_negative_envelopes: boolean;
}

