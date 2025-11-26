-- Migration: 022_add_multi_user_collaboration.sql
-- Description: Add multi-user collaboration feature with account-based access control
-- Date: 2025-01-15

-- =====================================================
-- STEP 1: Create new tables for account collaboration
-- =====================================================

-- Budget accounts table - represents a shared budget workspace
CREATE TABLE IF NOT EXISTS budget_accounts (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_budget_accounts_owner_id ON budget_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_budget_accounts_deleted_at ON budget_accounts(deleted_at) WHERE deleted_at IS NULL;

-- Account users table - junction table linking users to accounts with permissions
CREATE TABLE IF NOT EXISTS account_users (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'removed')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_account_users_account_id ON account_users(account_id);
CREATE INDEX IF NOT EXISTS idx_account_users_user_id ON account_users(user_id);
CREATE INDEX IF NOT EXISTS idx_account_users_status ON account_users(status);
CREATE INDEX IF NOT EXISTS idx_account_users_role ON account_users(account_id, role);

-- Account invitations table - tracks pending invitations
CREATE TABLE IF NOT EXISTS account_invitations (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_account_invitations_token ON account_invitations(token);
CREATE INDEX IF NOT EXISTS idx_account_invitations_email ON account_invitations(email);
CREATE INDEX IF NOT EXISTS idx_account_invitations_account_id ON account_invitations(account_id);

-- =====================================================
-- STEP 2: Enable RLS on new tables
-- =====================================================

ALTER TABLE budget_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budget_accounts
CREATE POLICY "Users can view accounts they belong to"
  ON budget_accounts FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM account_users
      WHERE account_users.account_id = budget_accounts.id
      AND account_users.user_id = auth.uid()
      AND account_users.status = 'active'
    )
  );

CREATE POLICY "Owners can update their accounts"
  ON budget_accounts FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their accounts"
  ON budget_accounts FOR DELETE
  USING (owner_id = auth.uid());

-- RLS Policies for account_users
CREATE POLICY "Users can view their account memberships"
  ON account_users FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = account_users.account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
      AND au.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Owners can add members"
  ON account_users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = account_users.account_id
      AND ba.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update member permissions"
  ON account_users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = account_users.account_id
      AND ba.owner_id = auth.uid()
    )
    AND role = 'owner'
  );

CREATE POLICY "Owners can remove members"
  ON account_users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = account_users.account_id
      AND ba.owner_id = auth.uid()
    )
    AND user_id != auth.uid()
  );

CREATE POLICY "Users can remove themselves"
  ON account_users FOR DELETE
  USING (user_id = auth.uid() AND role != 'owner');

-- RLS Policies for account_invitations
CREATE POLICY "Users can view invitations to their email"
  ON account_invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = account_invitations.account_id
      AND ba.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can create invitations"
  ON account_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = account_invitations.account_id
      AND ba.owner_id = auth.uid()
    )
  );

-- =====================================================
-- STEP 3: Migrate existing data
-- =====================================================

-- Create a budget_account for each existing user
-- Use a subquery to get email to avoid the issue with the same table reference
INSERT INTO budget_accounts (owner_id, name, created_at, updated_at)
SELECT 
  u.id as owner_id,
  COALESCE(u.email, 'My Budget') as name,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM budget_accounts ba
  WHERE ba.owner_id = u.id
  AND ba.deleted_at IS NULL
);

-- Add account_users entries for existing owners
-- Ensure all budget_accounts have account_users entries for their owners
INSERT INTO account_users (account_id, user_id, role, status, accepted_at, created_at, updated_at)
SELECT ba.id, ba.owner_id, 'owner', 'active', NOW(), NOW(), NOW()
FROM budget_accounts ba
WHERE ba.deleted_at IS NULL
AND NOT EXISTS (
  SELECT 1 FROM account_users au
  WHERE au.account_id = ba.id
  AND au.user_id = ba.owner_id
)
ON CONFLICT (account_id, user_id) DO UPDATE
SET 
  role = 'owner',
  status = 'active',
  accepted_at = COALESCE(account_users.accepted_at, NOW()),
  updated_at = NOW();

-- =====================================================
-- STEP 4: Add account_id columns to all existing tables
-- =====================================================

-- Add account_id column to all tables (nullable initially)
-- Note: transactions already has account_id for bank accounts, so we use budget_account_id
ALTER TABLE categories ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS budget_account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE pending_checks ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE merchant_mappings ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE imported_transactions ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE merchant_groups ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE merchant_category_rules ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
-- Note: income_settings and pre_tax_deductions tables don't exist in this schema
ALTER TABLE csv_import_templates ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE category_monthly_funding ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE user_backups ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE user_backups ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- =====================================================
-- STEP 5: Populate account_id from user_id
-- =====================================================

-- Populate account_id from user_id for all tables
UPDATE categories c
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = c.user_id AND c.account_id IS NULL;

UPDATE accounts a
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = a.user_id AND a.account_id IS NULL;

UPDATE credit_cards cc
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = cc.user_id AND cc.account_id IS NULL;

UPDATE transactions t
SET budget_account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = t.user_id AND t.budget_account_id IS NULL;

UPDATE pending_checks pc
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = pc.user_id AND pc.account_id IS NULL;

UPDATE merchant_mappings mm
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = mm.user_id AND mm.account_id IS NULL;

UPDATE imported_transactions it
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = it.user_id AND it.account_id IS NULL;

UPDATE merchant_groups mg
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = mg.user_id AND mg.account_id IS NULL;

UPDATE merchant_category_rules mcr
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = mcr.user_id AND mcr.account_id IS NULL;

UPDATE settings s
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = s.user_id AND s.account_id IS NULL;

UPDATE goals g
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = g.user_id AND g.account_id IS NULL;

UPDATE loans l
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = l.user_id AND l.account_id IS NULL;

-- Note: income_settings and pre_tax_deductions tables don't exist in this schema

UPDATE csv_import_templates cit
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = cit.user_id AND cit.account_id IS NULL;

UPDATE category_monthly_funding cmf
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = cmf.user_id AND cmf.account_id IS NULL;

UPDATE user_backups ub
SET account_id = ba.id, created_by = ub.user_id
FROM budget_accounts ba
WHERE ba.owner_id = ub.user_id AND ub.account_id IS NULL;

-- =====================================================
-- STEP 6: Make account_id NOT NULL and add indexes
-- =====================================================

-- Make account_id NOT NULL (after migration)
ALTER TABLE categories ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE accounts ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE credit_cards ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN budget_account_id SET NOT NULL;
ALTER TABLE pending_checks ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE merchant_mappings ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE imported_transactions ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE merchant_groups ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE merchant_category_rules ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE settings ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE goals ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE loans ALTER COLUMN account_id SET NOT NULL;
-- Note: income_settings and pre_tax_deductions tables don't exist in this schema
ALTER TABLE csv_import_templates ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE category_monthly_funding ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE user_backups ALTER COLUMN account_id SET NOT NULL;

-- Create indexes for account_id
CREATE INDEX IF NOT EXISTS idx_categories_account_id ON categories(account_id);
CREATE INDEX IF NOT EXISTS idx_accounts_account_id ON accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_account_id ON credit_cards(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_budget_account_id ON transactions(budget_account_id);
CREATE INDEX IF NOT EXISTS idx_pending_checks_account_id ON pending_checks(account_id);
CREATE INDEX IF NOT EXISTS idx_merchant_mappings_account_id ON merchant_mappings(account_id);
CREATE INDEX IF NOT EXISTS idx_imported_transactions_account_id ON imported_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_merchant_groups_account_id ON merchant_groups(account_id);
CREATE INDEX IF NOT EXISTS idx_merchant_category_rules_account_id ON merchant_category_rules(account_id);
CREATE INDEX IF NOT EXISTS idx_settings_account_id ON settings(account_id);
CREATE INDEX IF NOT EXISTS idx_goals_account_id ON goals(account_id);
CREATE INDEX IF NOT EXISTS idx_loans_account_id ON loans(account_id);
-- Note: income_settings and pre_tax_deductions tables don't exist in this schema
CREATE INDEX IF NOT EXISTS idx_csv_import_templates_account_id ON csv_import_templates(account_id);
CREATE INDEX IF NOT EXISTS idx_category_monthly_funding_account_id ON category_monthly_funding(account_id);
CREATE INDEX IF NOT EXISTS idx_user_backups_account_id ON user_backups(account_id);

-- =====================================================
-- STEP 7: Create helper functions for access checks
-- =====================================================

-- Helper function to check account access
CREATE OR REPLACE FUNCTION user_has_account_access(account_id_param BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM account_users au
    WHERE au.account_id = account_id_param
    AND au.user_id = auth.uid()
    AND au.status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM budget_accounts ba
    WHERE ba.id = account_id_param
    AND ba.owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check account write access
CREATE OR REPLACE FUNCTION user_has_account_write_access(account_id_param BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM account_users au
    WHERE au.account_id = account_id_param
    AND au.user_id = auth.uid()
    AND au.status = 'active'
    AND au.role IN ('owner', 'editor')
  ) OR EXISTS (
    SELECT 1 FROM budget_accounts ba
    WHERE ba.id = account_id_param
    AND ba.owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 8: Update RLS policies for existing tables
-- =====================================================

-- Drop old RLS policies and create new ones for categories
DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert their own categories" ON categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;

CREATE POLICY "Users can view categories in their accounts"
  ON categories FOR SELECT
  USING (user_has_account_access(account_id));

CREATE POLICY "Users can insert categories in their accounts"
  ON categories FOR INSERT
  WITH CHECK (user_has_account_write_access(account_id));

CREATE POLICY "Users can update categories in their accounts"
  ON categories FOR UPDATE
  USING (user_has_account_write_access(account_id));

CREATE POLICY "Users can delete categories in their accounts"
  ON categories FOR DELETE
  USING (user_has_account_write_access(account_id));

-- Update RLS policies for accounts
DROP POLICY IF EXISTS "Users can view their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can insert their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete their own accounts" ON accounts;

CREATE POLICY "Users can view accounts in their accounts"
  ON accounts FOR SELECT
  USING (user_has_account_access(account_id));

CREATE POLICY "Users can insert accounts in their accounts"
  ON accounts FOR INSERT
  WITH CHECK (user_has_account_write_access(account_id));

CREATE POLICY "Users can update accounts in their accounts"
  ON accounts FOR UPDATE
  USING (user_has_account_write_access(account_id));

CREATE POLICY "Users can delete accounts in their accounts"
  ON accounts FOR DELETE
  USING (user_has_account_write_access(account_id));

-- Update RLS policies for credit_cards
DROP POLICY IF EXISTS "Users can view their own credit cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can insert their own credit cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can update their own credit cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can delete their own credit cards" ON credit_cards;

CREATE POLICY "Users can view credit cards in their accounts"
  ON credit_cards FOR SELECT
  USING (user_has_account_access(account_id));

CREATE POLICY "Users can insert credit cards in their accounts"
  ON credit_cards FOR INSERT
  WITH CHECK (user_has_account_write_access(account_id));

CREATE POLICY "Users can update credit cards in their accounts"
  ON credit_cards FOR UPDATE
  USING (user_has_account_write_access(account_id));

CREATE POLICY "Users can delete credit cards in their accounts"
  ON credit_cards FOR DELETE
  USING (user_has_account_write_access(account_id));

-- Update RLS policies for transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;

CREATE POLICY "Users can view transactions in their accounts"
  ON transactions FOR SELECT
  USING (user_has_account_access(budget_account_id));

CREATE POLICY "Users can insert transactions in their accounts"
  ON transactions FOR INSERT
  WITH CHECK (user_has_account_write_access(budget_account_id));

CREATE POLICY "Users can update transactions in their accounts"
  ON transactions FOR UPDATE
  USING (user_has_account_write_access(budget_account_id));

CREATE POLICY "Users can delete transactions in their accounts"
  ON transactions FOR DELETE
  USING (user_has_account_write_access(budget_account_id));

-- Update RLS policies for pending_checks
DROP POLICY IF EXISTS "Users can view their own pending checks" ON pending_checks;
DROP POLICY IF EXISTS "Users can insert their own pending checks" ON pending_checks;
DROP POLICY IF EXISTS "Users can update their own pending checks" ON pending_checks;
DROP POLICY IF EXISTS "Users can delete their own pending checks" ON pending_checks;

CREATE POLICY "Users can view pending checks in their accounts"
  ON pending_checks FOR SELECT
  USING (user_has_account_access(account_id));

CREATE POLICY "Users can insert pending checks in their accounts"
  ON pending_checks FOR INSERT
  WITH CHECK (user_has_account_write_access(account_id));

CREATE POLICY "Users can update pending checks in their accounts"
  ON pending_checks FOR UPDATE
  USING (user_has_account_write_access(account_id));

CREATE POLICY "Users can delete pending checks in their accounts"
  ON pending_checks FOR DELETE
  USING (user_has_account_write_access(account_id));

-- Update RLS policies for merchant_mappings
DROP POLICY IF EXISTS "Users can view their own merchant mappings" ON merchant_mappings;
DROP POLICY IF EXISTS "Users can insert their own merchant mappings" ON merchant_mappings;
DROP POLICY IF EXISTS "Users can update their own merchant mappings" ON merchant_mappings;
DROP POLICY IF EXISTS "Users can delete their own merchant mappings" ON merchant_mappings;

CREATE POLICY "Users can view merchant mappings in their accounts"
  ON merchant_mappings FOR SELECT
  USING (user_has_account_access(account_id));

CREATE POLICY "Users can insert merchant mappings in their accounts"
  ON merchant_mappings FOR INSERT
  WITH CHECK (user_has_account_write_access(account_id));

CREATE POLICY "Users can update merchant mappings in their accounts"
  ON merchant_mappings FOR UPDATE
  USING (user_has_account_write_access(account_id));

CREATE POLICY "Users can delete merchant mappings in their accounts"
  ON merchant_mappings FOR DELETE
  USING (user_has_account_write_access(account_id));

-- Update RLS policies for imported_transactions
DROP POLICY IF EXISTS "Users can view their own imported transactions" ON imported_transactions;
DROP POLICY IF EXISTS "Users can insert their own imported transactions" ON imported_transactions;
DROP POLICY IF EXISTS "Users can update their own imported transactions" ON imported_transactions;
DROP POLICY IF EXISTS "Users can delete their own imported transactions" ON imported_transactions;

CREATE POLICY "Users can view imported transactions in their accounts"
  ON imported_transactions FOR SELECT
  USING (user_has_account_access(account_id));

CREATE POLICY "Users can insert imported transactions in their accounts"
  ON imported_transactions FOR INSERT
  WITH CHECK (user_has_account_write_access(account_id));

CREATE POLICY "Users can update imported transactions in their accounts"
  ON imported_transactions FOR UPDATE
  USING (user_has_account_write_access(account_id));

CREATE POLICY "Users can delete imported transactions in their accounts"
  ON imported_transactions FOR DELETE
  USING (user_has_account_write_access(account_id));

-- Update RLS policies for merchant_groups
DROP POLICY IF EXISTS "Users can view their own merchant groups" ON merchant_groups;
DROP POLICY IF EXISTS "Users can insert their own merchant groups" ON merchant_groups;
DROP POLICY IF EXISTS "Users can update their own merchant groups" ON merchant_groups;
DROP POLICY IF EXISTS "Users can delete their own merchant groups" ON merchant_groups;

CREATE POLICY "Users can view merchant groups in their accounts"
  ON merchant_groups FOR SELECT
  USING (user_has_account_access(account_id));

CREATE POLICY "Users can insert merchant groups in their accounts"
  ON merchant_groups FOR INSERT
  WITH CHECK (user_has_account_write_access(account_id));

CREATE POLICY "Users can update merchant groups in their accounts"
  ON merchant_groups FOR UPDATE
  USING (user_has_account_write_access(account_id));

CREATE POLICY "Users can delete merchant groups in their accounts"
  ON merchant_groups FOR DELETE
  USING (user_has_account_write_access(account_id));

-- Update RLS policies for merchant_category_rules
DROP POLICY IF EXISTS "Users can view their own merchant category rules" ON merchant_category_rules;
DROP POLICY IF EXISTS "Users can insert their own merchant category rules" ON merchant_category_rules;
DROP POLICY IF EXISTS "Users can update their own merchant category rules" ON merchant_category_rules;
DROP POLICY IF EXISTS "Users can delete their own merchant category rules" ON merchant_category_rules;

CREATE POLICY "Users can view merchant category rules in their accounts"
  ON merchant_category_rules FOR SELECT
  USING (user_has_account_access(account_id));

CREATE POLICY "Users can insert merchant category rules in their accounts"
  ON merchant_category_rules FOR INSERT
  WITH CHECK (user_has_account_write_access(account_id));

CREATE POLICY "Users can update merchant category rules in their accounts"
  ON merchant_category_rules FOR UPDATE
  USING (user_has_account_write_access(account_id));

CREATE POLICY "Users can delete merchant category rules in their accounts"
  ON merchant_category_rules FOR DELETE
  USING (user_has_account_write_access(account_id));

-- Update RLS policies for settings
DROP POLICY IF EXISTS "Users can view their own settings" ON settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON settings;

CREATE POLICY "Users can view settings in their accounts"
  ON settings FOR SELECT
  USING (user_has_account_access(account_id));

CREATE POLICY "Users can insert settings in their accounts"
  ON settings FOR INSERT
  WITH CHECK (user_has_account_write_access(account_id));

CREATE POLICY "Users can update settings in their accounts"
  ON settings FOR UPDATE
  USING (user_has_account_write_access(account_id));

CREATE POLICY "Users can delete settings in their accounts"
  ON settings FOR DELETE
  USING (user_has_account_write_access(account_id));

-- Update RLS policies for goals
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;

CREATE POLICY "Users can view goals in their accounts"
  ON goals FOR SELECT
  USING (user_has_account_access(account_id));

CREATE POLICY "Users can insert goals in their accounts"
  ON goals FOR INSERT
  WITH CHECK (user_has_account_write_access(account_id));

CREATE POLICY "Users can update goals in their accounts"
  ON goals FOR UPDATE
  USING (user_has_account_write_access(account_id));

CREATE POLICY "Users can delete goals in their accounts"
  ON goals FOR DELETE
  USING (user_has_account_write_access(account_id));

-- Update RLS policies for loans
DROP POLICY IF EXISTS "Users can view their own loans" ON loans;
DROP POLICY IF EXISTS "Users can insert their own loans" ON loans;
DROP POLICY IF EXISTS "Users can update their own loans" ON loans;
DROP POLICY IF EXISTS "Users can delete their own loans" ON loans;

CREATE POLICY "Users can view loans in their accounts"
  ON loans FOR SELECT
  USING (user_has_account_access(account_id));

CREATE POLICY "Users can insert loans in their accounts"
  ON loans FOR INSERT
  WITH CHECK (user_has_account_write_access(account_id));

CREATE POLICY "Users can update loans in their accounts"
  ON loans FOR UPDATE
  USING (user_has_account_write_access(account_id));

CREATE POLICY "Users can delete loans in their accounts"
  ON loans FOR DELETE
  USING (user_has_account_write_access(account_id));

-- Note: income_settings and pre_tax_deductions tables don't exist in this schema
-- RLS policies for these tables are skipped

-- Update RLS policies for csv_import_templates
DROP POLICY IF EXISTS "Users can view their own csv import templates" ON csv_import_templates;
DROP POLICY IF EXISTS "Users can insert their own csv import templates" ON csv_import_templates;
DROP POLICY IF EXISTS "Users can update their own csv import templates" ON csv_import_templates;
DROP POLICY IF EXISTS "Users can delete their own csv import templates" ON csv_import_templates;

CREATE POLICY "Users can view csv import templates in their accounts"
  ON csv_import_templates FOR SELECT
  USING (user_has_account_access(account_id));

CREATE POLICY "Users can insert csv import templates in their accounts"
  ON csv_import_templates FOR INSERT
  WITH CHECK (user_has_account_write_access(account_id));

CREATE POLICY "Users can update csv import templates in their accounts"
  ON csv_import_templates FOR UPDATE
  USING (user_has_account_write_access(account_id));

CREATE POLICY "Users can delete csv import templates in their accounts"
  ON csv_import_templates FOR DELETE
  USING (user_has_account_write_access(account_id));

-- Update RLS policies for category_monthly_funding
DROP POLICY IF EXISTS "Users can view their own category monthly funding" ON category_monthly_funding;
DROP POLICY IF EXISTS "Users can insert their own category monthly funding" ON category_monthly_funding;
DROP POLICY IF EXISTS "Users can update their own category monthly funding" ON category_monthly_funding;
DROP POLICY IF EXISTS "Users can delete their own category monthly funding" ON category_monthly_funding;

CREATE POLICY "Users can view category monthly funding in their accounts"
  ON category_monthly_funding FOR SELECT
  USING (user_has_account_access(account_id));

CREATE POLICY "Users can insert category monthly funding in their accounts"
  ON category_monthly_funding FOR INSERT
  WITH CHECK (user_has_account_write_access(account_id));

CREATE POLICY "Users can update category monthly funding in their accounts"
  ON category_monthly_funding FOR UPDATE
  USING (user_has_account_write_access(account_id));

CREATE POLICY "Users can delete category monthly funding in their accounts"
  ON category_monthly_funding FOR DELETE
  USING (user_has_account_write_access(account_id));

-- Update RLS policies for user_backups (account owners only)
DROP POLICY IF EXISTS "Users can view own backups" ON user_backups;
DROP POLICY IF EXISTS "Users can create own backups" ON user_backups;
DROP POLICY IF EXISTS "Users can delete own backups" ON user_backups;

CREATE POLICY "Account owners can view backups"
  ON user_backups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = user_backups.account_id
      AND ba.owner_id = auth.uid()
    )
  );

CREATE POLICY "Account owners can create backups"
  ON user_backups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = user_backups.account_id
      AND ba.owner_id = auth.uid()
    )
  );

CREATE POLICY "Account owners can delete backups"
  ON user_backups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = user_backups.account_id
      AND ba.owner_id = auth.uid()
    )
  );

