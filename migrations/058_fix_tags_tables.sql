-- Migration: 058_fix_tags_tables.sql
-- Description: Fix tags tables that failed to create properly in migration 055
-- Date: 2025-01-20

BEGIN;

-- Drop tables if they exist (from failed migration)
DROP TABLE IF EXISTS transaction_tags CASCADE;
DROP TABLE IF EXISTS tag_rules CASCADE;
DROP TABLE IF EXISTS tags CASCADE;

-- Create tags table (fixed version)
CREATE TABLE IF NOT EXISTS tags (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create transaction_tags junction table
CREATE TABLE IF NOT EXISTS transaction_tags (
  id BIGSERIAL PRIMARY KEY,
  transaction_id BIGINT REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  tag_id BIGINT REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(transaction_id, tag_id)
);

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
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_account_id ON tags(account_id);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_transaction_id ON transaction_tags(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_tag_id ON transaction_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_composite ON transaction_tags(transaction_id, tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_rules_account_id ON tag_rules(account_id);
CREATE INDEX IF NOT EXISTS idx_tag_rules_tag_id ON tag_rules(tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_rules_active ON tag_rules(account_id, is_active) WHERE is_active = TRUE;

-- Create unique index for case-insensitive tag names per account
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_account_name_unique ON tags(account_id, LOWER(name));

-- Enable RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags
CREATE POLICY "Users can view tags in their accounts" ON tags FOR SELECT 
  USING (
    account_id IN (
      SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
      UNION
      SELECT account_id FROM account_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can insert tags in their accounts" ON tags FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id
    AND account_id IN (
      SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
      UNION
      SELECT account_id FROM account_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can update tags in their accounts" ON tags FOR UPDATE 
  USING (
    account_id IN (
      SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
      UNION
      SELECT account_id FROM account_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can delete tags in their accounts" ON tags FOR DELETE 
  USING (
    account_id IN (
      SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
      UNION
      SELECT account_id FROM account_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- RLS Policies for transaction_tags
CREATE POLICY "Users can view transaction tags in their accounts" ON transaction_tags FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM transactions t 
      WHERE t.id = transaction_tags.transaction_id 
      AND t.budget_account_id IN (
        SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
        UNION
        SELECT account_id FROM account_users 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Users can insert transaction tags in their accounts" ON transaction_tags FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t 
      WHERE t.id = transaction_tags.transaction_id 
      AND t.budget_account_id IN (
        SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
        UNION
        SELECT account_id FROM account_users 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
    AND EXISTS (
      SELECT 1 FROM tags tag 
      WHERE tag.id = transaction_tags.tag_id 
      AND tag.account_id IN (
        SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
        UNION
        SELECT account_id FROM account_users 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Users can delete transaction tags in their accounts" ON transaction_tags FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM transactions t 
      WHERE t.id = transaction_tags.transaction_id 
      AND t.budget_account_id IN (
        SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
        UNION
        SELECT account_id FROM account_users 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

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
