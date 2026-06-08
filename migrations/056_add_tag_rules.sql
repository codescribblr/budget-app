-- Migration: 056_add_tag_rules.sql
-- Description: Add tag rules for auto-assignment
-- Date: 2025-01-20

BEGIN;

-- Create tag_rules table
CREATE TABLE IF NOT EXISTS tag_rules (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE NOT NULL,
  tag_id BIGINT REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('category', 'merchant', 'description', 'amount')),
  rule_value TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tag_rules_account_id ON tag_rules(account_id);
CREATE INDEX IF NOT EXISTS idx_tag_rules_tag_id ON tag_rules(tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_rules_active ON tag_rules(account_id, is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE tag_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tag_rules
CREATE POLICY "Users can view tag rules in their accounts" ON tag_rules FOR SELECT 
  USING (
    account_id IN (
      SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
      UNION
      SELECT account_id FROM account_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND EXISTS (
      SELECT 1 FROM tags tag 
      WHERE tag.id = tag_rules.tag_id 
      AND tag.account_id = tag_rules.account_id
    )
  );

CREATE POLICY "Users can insert tag rules in their accounts" ON tag_rules FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id
    AND account_id IN (
      SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
      UNION
      SELECT account_id FROM account_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND EXISTS (
      SELECT 1 FROM tags tag 
      WHERE tag.id = tag_rules.tag_id 
      AND tag.account_id = tag_rules.account_id
    )
  );

CREATE POLICY "Users can update tag rules in their accounts" ON tag_rules FOR UPDATE 
  USING (
    account_id IN (
      SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
      UNION
      SELECT account_id FROM account_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can delete tag rules in their accounts" ON tag_rules FOR DELETE 
  USING (
    account_id IN (
      SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
      UNION
      SELECT account_id FROM account_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

COMMIT;

