-- Migration: 088_fix_function_search_path_and_rls_warnings.sql
-- Description: Fix function search_path warnings and improve RLS policy security
-- Date: 2026-02-01

BEGIN;

-- =====================================================
-- Fix Function Search Path Warnings
-- =====================================================

-- Fix update_scheduled_jobs_updated_at (regular function)
CREATE OR REPLACE FUNCTION update_scheduled_jobs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix is_current_user_admin (SECURITY DEFINER - use empty search_path)
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  SELECT is_admin INTO admin_status
  FROM public.user_profiles
  WHERE user_id = auth.uid();
  
  RETURN COALESCE(admin_status, FALSE);
END;
$$;

-- Fix normalize_merchant_pattern (regular function)
CREATE OR REPLACE FUNCTION normalize_merchant_pattern(pattern_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Convert to lowercase and remove extra spaces
  RETURN lower(trim(regexp_replace(pattern_text, '\s+', ' ', 'g')));
END;
$$;

-- Fix create_user_profile (SECURITY DEFINER - use empty search_path)
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, is_admin)
  VALUES (NEW.id, FALSE)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Fix prevent_admin_status_change (SECURITY DEFINER - use empty search_path)
CREATE OR REPLACE FUNCTION prevent_admin_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- If admin status is being changed
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
    -- Count existing admins (bypass RLS)
    SELECT COUNT(*) INTO admin_count
    FROM public.user_profiles
    WHERE is_admin = TRUE;
    
    -- Allow if there are no admins yet (bootstrap scenario)
    -- OR if the current user is an admin
    IF admin_count = 0 THEN
      -- Bootstrap: Allow first admin to be created
      RETURN NEW;
    ELSIF NOT public.is_current_user_admin() THEN
      -- Non-admin trying to change admin status when admins exist - prevent it
      RAISE EXCEPTION 'Only admins can change admin status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix upsert_global_merchant_pattern (SECURITY DEFINER - use empty search_path)
CREATE OR REPLACE FUNCTION upsert_global_merchant_pattern(description_text TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_desc TEXT;
  existing_pattern_id BIGINT;
BEGIN
  -- Normalize the description
  normalized_desc := public.normalize_merchant_pattern(description_text);
  
  -- Try to find existing pattern (exact match)
  SELECT id INTO existing_pattern_id
  FROM public.global_merchant_patterns
  WHERE pattern = description_text OR normalized_pattern = normalized_desc
  LIMIT 1;
  
  IF existing_pattern_id IS NOT NULL THEN
    -- Update existing pattern: increment usage count and update last_seen_at
    UPDATE public.global_merchant_patterns
    SET 
      usage_count = usage_count + 1,
      last_seen_at = NOW(),
      updated_at = NOW()
    WHERE id = existing_pattern_id;
  ELSE
    -- Insert new pattern
    INSERT INTO public.global_merchant_patterns (pattern, normalized_pattern, usage_count, first_seen_at, last_seen_at)
    VALUES (description_text, normalized_desc, 1, NOW(), NOW())
    ON CONFLICT (pattern) DO UPDATE
    SET 
      usage_count = public.global_merchant_patterns.usage_count + 1,
      last_seen_at = NOW(),
      updated_at = NOW();
  END IF;
END;
$$;

-- Fix on_transaction_created_global_merchant (SECURITY DEFINER - use empty search_path)
CREATE OR REPLACE FUNCTION on_transaction_created_global_merchant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only process if description is not empty
  IF NEW.description IS NOT NULL AND trim(NEW.description) != '' THEN
    -- Upsert the global merchant pattern
    PERFORM public.upsert_global_merchant_pattern(NEW.description);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column (regular function - used in multiple places)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =====================================================
-- Fix RLS Policy Warnings
-- =====================================================

-- Fix global_merchant_patterns INSERT policy
-- Restrict to system roles (SECURITY DEFINER functions run as postgres/service_role)
-- This prevents direct user inserts while allowing the trigger to work
-- The trigger function uses SECURITY DEFINER, so it bypasses RLS anyway, but we
-- still need a policy that allows system operations while blocking user operations
DROP POLICY IF EXISTS "System can insert global merchant patterns" ON global_merchant_patterns;
CREATE POLICY "System can insert global merchant patterns"
  ON global_merchant_patterns FOR INSERT
  WITH CHECK (auth.role() NOT IN ('anon', 'authenticated'));

-- Fix queued_imports INSERT policy
-- Restrict to users who have access to the account being referenced
-- This ensures users can only create queued imports for accounts they belong to
-- Use the existing user_has_account_access function for consistency
DROP POLICY IF EXISTS "System can create queued imports" ON queued_imports;
CREATE POLICY "Users can create queued imports for their accounts"
  ON queued_imports FOR INSERT
  WITH CHECK (user_has_account_access(account_id));

COMMIT;
