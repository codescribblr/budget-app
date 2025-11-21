-- Migration: 014_add_account_credit_card_to_transactions.sql
-- Description: Add account_id and credit_card_id columns to transactions table for tracking transaction sources
-- Date: 2025-01-22

-- Add account_id column
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL;

-- Add credit_card_id column
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS credit_card_id BIGINT REFERENCES credit_cards(id) ON DELETE SET NULL;

-- Add CHECK constraint to ensure only one is set (mutually exclusive)
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_account_credit_card_check;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_account_credit_card_check 
CHECK (account_id IS NULL OR credit_card_id IS NULL);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_credit_card_id ON transactions(credit_card_id);

-- Add comments for documentation
COMMENT ON COLUMN transactions.account_id IS 'References accounts table. Mutually exclusive with credit_card_id.';
COMMENT ON COLUMN transactions.credit_card_id IS 'References credit_cards table. Mutually exclusive with account_id.';

