-- Migration: 075_add_account_balance_audit.sql
-- Description: Add audit trail tables for tracking account, credit card, loan, and asset balance changes
-- Date: 2025-01-XX

BEGIN;

-- =====================================================
-- ACCOUNT BALANCE AUDIT
-- =====================================================

CREATE TABLE IF NOT EXISTS account_balance_audit (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  budget_account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_balance DECIMAL(10,2) NOT NULL,
  new_balance DECIMAL(10,2) NOT NULL,
  change_amount DECIMAL(10,2) NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN (
    'manual_edit',
    'transaction_create',
    'transaction_update',
    'transaction_delete',
    'transaction_import',
    'transfer'
  )),
  transaction_id BIGINT REFERENCES transactions(id) ON DELETE SET NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_balance_audit_account_id ON account_balance_audit(account_id);
CREATE INDEX IF NOT EXISTS idx_account_balance_audit_budget_account_id ON account_balance_audit(budget_account_id);
CREATE INDEX IF NOT EXISTS idx_account_balance_audit_user_id ON account_balance_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_account_balance_audit_created_at ON account_balance_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_balance_audit_account_created ON account_balance_audit(account_id, created_at DESC);

ALTER TABLE account_balance_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view account audit records for their accounts"
  ON account_balance_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = account_balance_audit.budget_account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
    )
  );

CREATE POLICY "Users can insert account audit records"
  ON account_balance_audit FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = account_balance_audit.budget_account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
    )
    AND user_id = auth.uid()
  );

-- =====================================================
-- CREDIT CARD BALANCE AUDIT (tracks available_credit)
-- =====================================================

CREATE TABLE IF NOT EXISTS credit_card_balance_audit (
  id BIGSERIAL PRIMARY KEY,
  credit_card_id BIGINT NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  budget_account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_available_credit DECIMAL(10,2) NOT NULL,
  new_available_credit DECIMAL(10,2) NOT NULL,
  change_amount DECIMAL(10,2) NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN (
    'manual_edit',
    'transaction_create',
    'transaction_update',
    'transaction_delete',
    'transaction_import',
    'payment'
  )),
  transaction_id BIGINT REFERENCES transactions(id) ON DELETE SET NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_card_balance_audit_credit_card_id ON credit_card_balance_audit(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_balance_audit_budget_account_id ON credit_card_balance_audit(budget_account_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_balance_audit_user_id ON credit_card_balance_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_balance_audit_created_at ON credit_card_balance_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_card_balance_audit_credit_card_created ON credit_card_balance_audit(credit_card_id, created_at DESC);

ALTER TABLE credit_card_balance_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view credit card audit records for their accounts"
  ON credit_card_balance_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = credit_card_balance_audit.budget_account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
    )
  );

CREATE POLICY "Users can insert credit card audit records"
  ON credit_card_balance_audit FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = credit_card_balance_audit.budget_account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
    )
    AND user_id = auth.uid()
  );

-- =====================================================
-- LOAN BALANCE AUDIT
-- =====================================================

CREATE TABLE IF NOT EXISTS loan_balance_audit (
  id BIGSERIAL PRIMARY KEY,
  loan_id BIGINT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  budget_account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_balance DECIMAL(10,2) NOT NULL,
  new_balance DECIMAL(10,2) NOT NULL,
  change_amount DECIMAL(10,2) NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN (
    'manual_edit',
    'payment',
    'interest_accrual',
    'principal_adjustment'
  )),
  transaction_id BIGINT REFERENCES transactions(id) ON DELETE SET NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_balance_audit_loan_id ON loan_balance_audit(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_balance_audit_budget_account_id ON loan_balance_audit(budget_account_id);
CREATE INDEX IF NOT EXISTS idx_loan_balance_audit_user_id ON loan_balance_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_balance_audit_created_at ON loan_balance_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loan_balance_audit_loan_created ON loan_balance_audit(loan_id, created_at DESC);

ALTER TABLE loan_balance_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view loan audit records for their accounts"
  ON loan_balance_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = loan_balance_audit.budget_account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
    )
  );

CREATE POLICY "Users can insert loan audit records"
  ON loan_balance_audit FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = loan_balance_audit.budget_account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
    )
    AND user_id = auth.uid()
  );

-- =====================================================
-- ASSET VALUE AUDIT
-- =====================================================

CREATE TABLE IF NOT EXISTS asset_value_audit (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT NOT NULL REFERENCES non_cash_assets(id) ON DELETE CASCADE,
  budget_account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_value DECIMAL(12,2) NOT NULL,
  new_value DECIMAL(12,2) NOT NULL,
  change_amount DECIMAL(12,2) NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN (
    'manual_edit',
    'value_update',
    'appreciation',
    'depreciation'
  )),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_value_audit_asset_id ON asset_value_audit(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_value_audit_budget_account_id ON asset_value_audit(budget_account_id);
CREATE INDEX IF NOT EXISTS idx_asset_value_audit_user_id ON asset_value_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_value_audit_created_at ON asset_value_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_value_audit_asset_created ON asset_value_audit(asset_id, created_at DESC);

ALTER TABLE asset_value_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view asset audit records for their accounts"
  ON asset_value_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = asset_value_audit.budget_account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
    )
  );

CREATE POLICY "Users can insert asset audit records"
  ON asset_value_audit FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = asset_value_audit.budget_account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
    )
    AND user_id = auth.uid()
  );

-- =====================================================
-- NET WORTH SNAPSHOT
-- =====================================================

CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id BIGSERIAL PRIMARY KEY,
  budget_account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_accounts DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_credit_cards DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_loans DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_assets DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_worth DECIMAL(12,2) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(budget_account_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_net_worth_snapshots_budget_account_id ON net_worth_snapshots(budget_account_id);
CREATE INDEX IF NOT EXISTS idx_net_worth_snapshots_snapshot_date ON net_worth_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_net_worth_snapshots_account_date ON net_worth_snapshots(budget_account_id, snapshot_date DESC);

ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view net worth snapshots for their accounts"
  ON net_worth_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = net_worth_snapshots.budget_account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
    )
  );

CREATE POLICY "Users can insert net worth snapshots for their accounts"
  ON net_worth_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = net_worth_snapshots.budget_account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
    )
  );

COMMENT ON TABLE account_balance_audit IS 'Audit trail for all changes to account balances';
COMMENT ON TABLE credit_card_balance_audit IS 'Audit trail for all changes to credit card available credit';
COMMENT ON TABLE loan_balance_audit IS 'Audit trail for all changes to loan balances';
COMMENT ON TABLE asset_value_audit IS 'Audit trail for all changes to non-cash asset values';
COMMENT ON TABLE net_worth_snapshots IS 'Daily snapshots of net worth for tracking changes over time';

COMMIT;
