-- Migration: 068_add_admin_support.sql
-- Description: Add admin support with user_profiles table and admin flag
-- Date: 2025-01-XX

BEGIN;

-- Create user_profiles table for admin and other user profile data
CREATE TABLE IF NOT EXISTS user_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON user_profiles(is_admin) WHERE is_admin = TRUE;

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;

-- RLS Policies for user_profiles
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile (but not is_admin - that requires admin privileges)
-- Note: Admin status changes are prevented by application logic and a trigger below
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to check if current user is admin (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  SELECT is_admin INTO admin_status
  FROM user_profiles
  WHERE user_id = auth.uid();
  
  RETURN COALESCE(admin_status, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (is_current_user_admin());

-- Admins can update any profile (including is_admin)
CREATE POLICY "Admins can update any profile"
  ON user_profiles FOR UPDATE
  USING (is_current_user_admin());

-- Function to automatically create user profile on user creation
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, is_admin)
  VALUES (NEW.id, FALSE)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Function to backfill profiles for existing users (bypasses RLS)
CREATE OR REPLACE FUNCTION backfill_user_profiles()
RETURNS void AS $$
BEGIN
  INSERT INTO user_profiles (user_id, is_admin)
  SELECT id, FALSE
  FROM auth.users
  WHERE id NOT IN (SELECT user_id FROM user_profiles)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill: Create profiles for all existing users who don't have one
SELECT backfill_user_profiles();

-- Clean up the backfill function (optional, but keeps things clean)
DROP FUNCTION IF EXISTS backfill_user_profiles();

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to prevent non-admins from changing admin status
CREATE OR REPLACE FUNCTION prevent_admin_status_change()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- If admin status is being changed
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
    -- Count existing admins (bypass RLS)
    SELECT COUNT(*) INTO admin_count
    FROM user_profiles
    WHERE is_admin = TRUE;
    
    -- Allow if there are no admins yet (bootstrap scenario)
    -- OR if the current user is an admin
    IF admin_count = 0 THEN
      -- Bootstrap: Allow first admin to be created
      RETURN NEW;
    ELSIF NOT is_current_user_admin() THEN
      -- Non-admin trying to change admin status when admins exist - prevent it
      RAISE EXCEPTION 'Only admins can change admin status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to prevent non-admins from changing admin status
DROP TRIGGER IF EXISTS prevent_admin_status_change_trigger ON user_profiles;
CREATE TRIGGER prevent_admin_status_change_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_admin_status_change();

COMMIT;
