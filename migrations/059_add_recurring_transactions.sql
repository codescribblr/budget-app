-- Migration: 059_add_recurring_transactions.sql
-- Description: Add recurring transactions detection and tracking
-- Date: 2025-01-XX

BEGIN;

-- Create recurring_transactions table
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  budget_account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE NOT NULL,
  merchant_group_id BIGINT REFERENCES merchant_groups(id) ON DELETE SET NULL,
  merchant_name TEXT NOT NULL,
  description_pattern TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'yearly', 'custom')),
  interval INTEGER DEFAULT 1,
  day_of_month INTEGER,
  day_of_week INTEGER,
  week_of_month INTEGER,
  expected_amount DECIMAL(10,2),
  amount_variance DECIMAL(10,2) DEFAULT 0,
  is_amount_variable BOOLEAN DEFAULT FALSE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  credit_card_id BIGINT REFERENCES credit_cards(id) ON DELETE SET NULL,
  detection_method TEXT DEFAULT 'automatic' CHECK (detection_method IN ('automatic', 'manual', 'user_confirmed')),
  confidence_score DECIMAL(3,2) DEFAULT 0.0 CHECK (confidence_score >= 0 AND confidence_score <= 1.0),
  detection_date TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  is_confirmed BOOLEAN DEFAULT FALSE,
  last_occurrence_date DATE,
  next_expected_date DATE,
  occurrence_count INTEGER DEFAULT 0,
  notes TEXT,
  reminder_days_before INTEGER DEFAULT 2,
  reminder_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create recurring_transaction_matches table
CREATE TABLE IF NOT EXISTS recurring_transaction_matches (
  id BIGSERIAL PRIMARY KEY,
  recurring_transaction_id BIGINT REFERENCES recurring_transactions(id) ON DELETE CASCADE NOT NULL,
  transaction_id BIGINT REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  match_confidence DECIMAL(3,2) DEFAULT 1.0,
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recurring_transaction_id, transaction_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_id ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_account_id ON recurring_transactions(budget_account_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_merchant_group_id ON recurring_transactions(merchant_group_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_next_expected_date ON recurring_transactions(next_expected_date) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_active ON recurring_transactions(is_active, is_confirmed) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_recurring_matches_recurring_id ON recurring_transaction_matches(recurring_transaction_id);
CREATE INDEX IF NOT EXISTS idx_recurring_matches_transaction_id ON recurring_transaction_matches(transaction_id);

-- Enable RLS
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transaction_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurring_transactions
-- Users can only access recurring transactions in accounts they belong to
CREATE POLICY "Users can view recurring transactions in their accounts" ON recurring_transactions FOR SELECT 
  USING (
    budget_account_id IN (
      SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
      UNION
      SELECT account_id FROM account_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can insert recurring transactions in their accounts" ON recurring_transactions FOR INSERT
  WITH CHECK (
    budget_account_id IN (
      SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
      UNION
      SELECT account_id FROM account_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update recurring transactions in their accounts" ON recurring_transactions FOR UPDATE
  USING (
    budget_account_id IN (
      SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
      UNION
      SELECT account_id FROM account_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    budget_account_id IN (
      SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
      UNION
      SELECT account_id FROM account_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can delete recurring transactions in their accounts" ON recurring_transactions FOR DELETE
  USING (
    budget_account_id IN (
      SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
      UNION
      SELECT account_id FROM account_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- RLS Policies for recurring_transaction_matches
CREATE POLICY "Users can view matches for recurring transactions in their accounts" ON recurring_transaction_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recurring_transactions
      WHERE recurring_transactions.id = recurring_transaction_matches.recurring_transaction_id
      AND recurring_transactions.budget_account_id IN (
        SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
        UNION
        SELECT account_id FROM account_users 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Users can insert matches for recurring transactions in their accounts" ON recurring_transaction_matches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recurring_transactions
      WHERE recurring_transactions.id = recurring_transaction_matches.recurring_transaction_id
      AND recurring_transactions.budget_account_id IN (
        SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
        UNION
        SELECT account_id FROM account_users 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

COMMIT;



