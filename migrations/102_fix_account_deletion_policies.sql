-- Migration: 102_fix_account_deletion_policies.sql
-- Description: Fix RLS policies to allow account owners to delete their own account_users entry when deleting accounts
-- Date: 2026-02-02

-- Add a policy that allows account owners to delete their own account_users entry
-- This is needed when an owner deletes their budget account
CREATE POLICY "Owners can delete their own membership when deleting account"
  ON account_users FOR DELETE
  USING (
    user_id = auth.uid()
    AND role = 'owner'
    AND EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = account_users.account_id
      AND ba.owner_id = auth.uid()
    )
  );
