-- Migration: 045_fix_function_search_path.sql
-- Description: Fix function search_path warnings by setting explicit search_path
-- Date: 2025-01-XX
-- 
-- This migration fixes security warnings about mutable search_path in functions.
-- For SECURITY DEFINER functions, we set search_path = '' and use fully qualified names.
-- For regular functions, we set search_path = public.

BEGIN;

-- Fix update_user_subscriptions_updated_at
CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix cleanup_expired_insights
CREATE OR REPLACE FUNCTION cleanup_expired_insights()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ai_insights_cache
  WHERE expires_at < NOW();
END;
$$;

-- Fix user_has_account_access (SECURITY DEFINER - use empty search_path)
CREATE OR REPLACE FUNCTION user_has_account_access(account_id_param BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.account_users au
    WHERE au.account_id = account_id_param
    AND au.user_id = auth.uid()
    AND au.status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.budget_accounts ba
    WHERE ba.id = account_id_param
    AND ba.owner_id = auth.uid()
  );
END;
$$;

-- Fix update_ai_conversation_updated_at
CREATE OR REPLACE FUNCTION update_ai_conversation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix user_has_account_write_access (SECURITY DEFINER - use empty search_path)
CREATE OR REPLACE FUNCTION user_has_account_write_access(account_id_param BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.account_users au
    WHERE au.account_id = account_id_param
    AND au.user_id = auth.uid()
    AND au.status = 'active'
    AND au.role IN ('owner', 'editor')
  ) OR EXISTS (
    SELECT 1 FROM public.budget_accounts ba
    WHERE ba.id = account_id_param
    AND ba.owner_id = auth.uid()
  );
END;
$$;

-- Fix user_is_account_member (SECURITY DEFINER - use empty search_path)
CREATE OR REPLACE FUNCTION user_is_account_member(account_id_param BIGINT, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_users
    WHERE public.account_users.account_id = account_id_param
    AND public.account_users.user_id = user_id_param
    AND public.account_users.status = 'active'
  );
$$;

-- Fix get_user_email (SECURITY DEFINER - use empty search_path)
CREATE OR REPLACE FUNCTION public.get_user_email(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = user_id_param;
  RETURN user_email;
END;
$$;

-- Fix user_has_valid_invitation (SECURITY DEFINER - use empty search_path)
CREATE OR REPLACE FUNCTION public.user_has_valid_invitation(account_id_param BIGINT, user_email_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Fix update_merchant_updated_at
CREATE OR REPLACE FUNCTION update_merchant_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix update_merchant_category_rules_updated_at
CREATE OR REPLACE FUNCTION update_merchant_category_rules_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMIT;

