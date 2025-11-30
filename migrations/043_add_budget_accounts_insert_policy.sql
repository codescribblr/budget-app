-- Migration: 043_add_budget_accounts_insert_policy.sql
-- Description: Add INSERT policy for budget_accounts to allow users to create their own accounts
-- Date: 2025-01-26

-- Drop policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Users can create their own budget accounts" ON budget_accounts;

-- Add INSERT policy for budget_accounts
-- Users can create budget accounts where they are the owner
CREATE POLICY "Users can create their own budget accounts"
  ON budget_accounts FOR INSERT
  WITH CHECK (owner_id = auth.uid());

