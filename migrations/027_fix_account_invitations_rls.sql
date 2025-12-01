-- Migration: 027_fix_account_invitations_rls.sql
-- Description: Fix RLS policy for account_invitations that tries to access auth.users directly
-- Date: 2025-01-15

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view invitations to their email" ON public.account_invitations;

-- Create a SECURITY DEFINER function to get user email
CREATE OR REPLACE FUNCTION public.get_user_email(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id_param;
  RETURN user_email;
END;
$$;

-- Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_email(UUID) TO authenticated;

-- Recreate the policy using the SECURITY DEFINER function
CREATE POLICY "Users can view invitations to their email"
  ON public.account_invitations FOR SELECT
  USING (
    email = public.get_user_email(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.budget_accounts ba
      WHERE ba.id = account_invitations.account_id
      AND ba.owner_id = auth.uid()
    )
  );





