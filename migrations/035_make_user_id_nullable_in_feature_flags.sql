-- Migration: 035_make_user_id_nullable_in_feature_flags.sql
-- Description: Make user_id nullable in user_feature_flags table for account-based feature flags
-- Date: 2025-01-16

-- Make user_id nullable (account_id is now the primary identifier)
ALTER TABLE user_feature_flags
ALTER COLUMN user_id DROP NOT NULL;







