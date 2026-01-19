-- Migration: 067_add_category_balance_audit.sql
-- Description: Add audit trail table for tracking category envelope balance changes
-- Date: 2025-01-XX

BEGIN;

-- Create category_balance_audit table
CREATE TABLE IF NOT EXISTS category_balance_audit (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_balance DECIMAL(10,2) NOT NULL,
  new_balance DECIMAL(10,2) NOT NULL,
  change_amount DECIMAL(10,2) NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN (
    'transaction_create',
    'transaction_update',
    'transaction_delete',
    'transaction_import',
    'allocation_batch',
    'allocation_manual',
    'allocation_income',
    'transfer_from',
    'transfer_to',
    'manual_edit',
    'transaction_merge',
    'income_buffer_fund'
  )),
  transaction_id BIGINT REFERENCES transactions(id) ON DELETE SET NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_category_balance_audit_category_id ON category_balance_audit(category_id);
CREATE INDEX IF NOT EXISTS idx_category_balance_audit_account_id ON category_balance_audit(account_id);
CREATE INDEX IF NOT EXISTS idx_category_balance_audit_user_id ON category_balance_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_category_balance_audit_created_at ON category_balance_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_category_balance_audit_transaction_id ON category_balance_audit(transaction_id);
CREATE INDEX IF NOT EXISTS idx_category_balance_audit_category_created ON category_balance_audit(category_id, created_at DESC);

-- RLS Policies
ALTER TABLE category_balance_audit ENABLE ROW LEVEL SECURITY;

-- Users can view audit records for categories in their accounts
CREATE POLICY "Users can view audit records for their account categories"
  ON category_balance_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = category_balance_audit.account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
    )
  );

-- System can insert audit records (via service role or function)
-- Note: This will be handled by the application code with proper user context
CREATE POLICY "Users can insert audit records for their account categories"
  ON category_balance_audit FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = category_balance_audit.account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
    )
    AND user_id = auth.uid()
  );

-- Comments for documentation
COMMENT ON TABLE category_balance_audit IS 'Audit trail for all changes to category envelope balances';
COMMENT ON COLUMN category_balance_audit.change_type IS 'Type of change: transaction_create, transaction_update, transaction_delete, transaction_import, allocation_batch, allocation_manual, allocation_income, transfer_from, transfer_to, manual_edit, transaction_merge, income_buffer_fund';
COMMENT ON COLUMN category_balance_audit.change_amount IS 'The amount changed (positive for increases, negative for decreases)';
COMMENT ON COLUMN category_balance_audit.metadata IS 'Additional context about the change (e.g., import file name, transfer details, etc.)';

COMMIT;
