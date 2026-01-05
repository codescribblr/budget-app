-- Migration: 044_add_duplicate_group_reviews_rls.sql
-- Description: Add RLS policies for duplicate_group_reviews table
-- Date: 2025-01-XX

BEGIN;

-- Enable Row Level Security
ALTER TABLE duplicate_group_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for duplicate_group_reviews
-- Users can view duplicate group reviews in their accounts
CREATE POLICY "Users can view duplicate group reviews in their accounts"
  ON duplicate_group_reviews FOR SELECT
  USING (user_has_account_access(budget_account_id));

-- Users can insert duplicate group reviews in their accounts (with write access)
CREATE POLICY "Users can insert duplicate group reviews in their accounts"
  ON duplicate_group_reviews FOR INSERT
  WITH CHECK (user_has_account_write_access(budget_account_id));

-- Users can update duplicate group reviews in their accounts (with write access)
CREATE POLICY "Users can update duplicate group reviews in their accounts"
  ON duplicate_group_reviews FOR UPDATE
  USING (user_has_account_write_access(budget_account_id));

-- Users can delete duplicate group reviews in their accounts (with write access)
CREATE POLICY "Users can delete duplicate group reviews in their accounts"
  ON duplicate_group_reviews FOR DELETE
  USING (user_has_account_write_access(budget_account_id));

COMMIT;


