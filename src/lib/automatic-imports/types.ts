/**
 * Types for automatic transaction import system
 */

export type ImportSourceType = 'email' | 'plaid' | 'yodlee' | 'finicity' | 'mx' | 'teller';

export interface AutomaticImportSetup {
  id: number;
  account_id: number;
  user_id: string;
  source_type: ImportSourceType;
  source_identifier: string;
  target_account_id: number | null;
  target_credit_card_id: number | null;
  is_historical: boolean;
  is_active: boolean;
  source_config: Record<string, any>;
  integration_name: string | null;
  bank_name: string | null;
  account_numbers: string[] | null;
  estimated_monthly_cost: number | null;
  last_month_transaction_count: number;
  last_fetch_at: string | null;
  last_successful_fetch_at: string | null;
  last_error: string | null;
  error_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface QueuedImport {
  id: number;
  account_id: number;
  import_setup_id: number;
  transaction_date: string;
  description: string;
  merchant: string;
  amount: number;
  transaction_type: 'income' | 'expense';
  hash: string;
  original_data: Record<string, any> | null;
  suggested_category_id: number | null;
  suggested_merchant: string | null;
  target_account_id: number | null;
  target_credit_card_id: number | null;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'imported';
  is_historical: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  imported_transaction_id: number | null;
  imported_at: string | null;
  source_batch_id: string | null;
  source_fetched_at: string;
  created_at: string;
  updated_at: string;
}

export interface QueuedImportBatch {
  batch_id: string;
  import_setup_id: number;
  setup_name: string;
  source_type: ImportSourceType;
  count: number;
  date_range: { start: string; end: string };
  created_at: string;
  status: 'pending' | 'reviewing' | 'partially_approved' | 'approved' | 'rejected';
  target_account_name: string | null;
  target_account_id: number | null;
  is_credit_card: boolean;
  is_historical: boolean | 'mixed';
}

export interface ImportProviderConfig {
  name: string;
  type: ImportSourceType;
  displayName: string;
  description: string;
  costPerTransaction: string;
  bankCoverage: string;
  reliability: number;
  requiresPremium: boolean;
  isAvailable: boolean;
}
