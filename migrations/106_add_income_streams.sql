-- Migration: 106_add_income_streams.sql
-- Description: Add income_streams table for multiple income streams per account
-- Date: 2026-02-21
--
-- Each income stream can have its own pay frequency, tax rate, deductions, etc.
-- include_in_budget controls whether the stream counts toward monthly budget calculations.
-- Migration from legacy settings is handled in application code.

CREATE TABLE IF NOT EXISTS income_streams (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  annual_income DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(6,4) NOT NULL DEFAULT 0,
  pay_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (pay_frequency IN ('weekly', 'bi-weekly', 'semi-monthly', 'monthly', 'quarterly', 'annually')),
  include_extra_paychecks BOOLEAN NOT NULL DEFAULT true,
  pre_tax_deduction_items JSONB NOT NULL DEFAULT '[]',
  include_in_budget BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_income_streams_account_id ON income_streams(account_id);
CREATE INDEX IF NOT EXISTS idx_income_streams_sort_order ON income_streams(account_id, sort_order);

ALTER TABLE income_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view income streams in their accounts"
  ON income_streams FOR SELECT
  USING (user_has_account_access(account_id));

CREATE POLICY "Users can insert income streams in their accounts"
  ON income_streams FOR INSERT
  WITH CHECK (user_has_account_write_access(account_id));

CREATE POLICY "Users can update income streams in their accounts"
  ON income_streams FOR UPDATE
  USING (user_has_account_write_access(account_id));

CREATE POLICY "Users can delete income streams in their accounts"
  ON income_streams FOR DELETE
  USING (user_has_account_write_access(account_id));
