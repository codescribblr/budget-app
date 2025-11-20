-- Migration: 013_add_debt_paydown_goals.sql
-- Description: Add support for debt paydown goals linked to credit cards
-- Date: 2025-01-XX

-- Add column for linking credit cards to debt-paydown goals
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS linked_credit_card_id BIGINT REFERENCES credit_cards(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_goals_linked_credit_card ON goals(linked_credit_card_id);

-- Update goal_type constraint to include 'debt-paydown'
ALTER TABLE goals 
DROP CONSTRAINT IF EXISTS goals_goal_type_check;

ALTER TABLE goals 
ADD CONSTRAINT goals_goal_type_check 
CHECK (goal_type IN ('envelope', 'account-linked', 'debt-paydown'));

-- Update constraints to handle debt-paydown goals
-- Remove old constraints if they exist
ALTER TABLE goals 
DROP CONSTRAINT IF EXISTS envelope_has_category;

ALTER TABLE goals 
DROP CONSTRAINT IF EXISTS account_linked_has_account;

-- Add new comprehensive constraint for all goal types
ALTER TABLE goals 
ADD CONSTRAINT goal_type_constraints CHECK (
  (goal_type = 'envelope' AND linked_category_id IS NOT NULL AND linked_account_id IS NULL AND linked_credit_card_id IS NULL) OR
  (goal_type = 'account-linked' AND linked_account_id IS NOT NULL AND linked_category_id IS NULL AND linked_credit_card_id IS NULL) OR
  (goal_type = 'debt-paydown' AND linked_credit_card_id IS NOT NULL AND linked_account_id IS NULL AND linked_category_id IS NULL)
);

-- Add comment to explain the new column
COMMENT ON COLUMN goals.linked_credit_card_id IS 'References credit_cards table. Only used for debt-paydown goal type.';

