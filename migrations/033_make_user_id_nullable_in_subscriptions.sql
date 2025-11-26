-- Migration: 033_make_user_id_nullable_in_subscriptions.sql
-- Description: Make user_id nullable in user_subscriptions since we're using account_id now
-- Date: 2025-01-16

-- Make user_id nullable (we're using account_id now)
ALTER TABLE user_subscriptions
ALTER COLUMN user_id DROP NOT NULL;


