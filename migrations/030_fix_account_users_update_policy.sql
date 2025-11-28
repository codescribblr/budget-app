-- Migration: 030_fix_account_users_update_policy.sql
-- Description: Fix RLS policy for updating account_users - remove incorrect role check
-- Date: 2025-01-15

-- Drop the problematic policy
DROP POLICY IF EXISTS "Owners can update member permissions" ON public.account_users;

-- Recreate the policy without the incorrect role check
-- The policy should check if the current user is the account owner, not if the row has role='owner'
CREATE POLICY "Owners can update member permissions"
  ON public.account_users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.budget_accounts ba
      WHERE ba.id = account_users.account_id
      AND ba.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.budget_accounts ba
      WHERE ba.id = account_users.account_id
      AND ba.owner_id = auth.uid()
    )
  );



