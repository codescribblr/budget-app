-- Migration: 029_allow_users_to_accept_invitations.sql
-- Description: Allow users to insert themselves into account_users when accepting invitations
-- Date: 2025-01-15

-- Create a SECURITY DEFINER function to check if user has a valid invitation
-- This function runs with the privileges of the definer (postgres), bypassing RLS
CREATE OR REPLACE FUNCTION public.user_has_valid_invitation(account_id_param BIGINT, user_email_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.account_invitations
    WHERE account_id = account_id_param
    AND email = user_email_param
    AND accepted_at IS NULL
    AND expires_at > NOW()
  );
END;
$$;

-- Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.user_has_valid_invitation(BIGINT, TEXT) TO authenticated;

-- Create a SECURITY DEFINER function to get user email
CREATE OR REPLACE FUNCTION public.get_user_email(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = user_id_param;
  RETURN user_email;
END;
$$;

-- Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_email(UUID) TO authenticated;

-- Add policy to allow users to insert themselves when accepting invitations
CREATE POLICY "Users can accept invitations"
  ON public.account_users FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.user_has_valid_invitation(
      account_id,
      public.get_user_email(auth.uid())
    )
  );



