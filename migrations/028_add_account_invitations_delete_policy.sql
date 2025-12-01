-- Migration: 028_add_account_invitations_delete_policy.sql
-- Description: Add DELETE policy for account_invitations so owners can cancel invitations
-- Date: 2025-01-15

-- Add DELETE policy for account_invitations
CREATE POLICY "Owners can delete invitations"
  ON public.account_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.budget_accounts ba
      WHERE ba.id = account_invitations.account_id
      AND ba.owner_id = auth.uid()
    )
  );





