-- Migration: 037_add_transaction_type_to_transactions.sql
-- Description: Add transaction_type column to transactions table
-- Date: 2025-01-20

-- Add transaction_type column with default 'expense' for backward compatibility
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS transaction_type TEXT NOT NULL DEFAULT 'expense'
CHECK (transaction_type IN ('income', 'expense'));

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON transactions(transaction_type);

-- Add comment for documentation
COMMENT ON COLUMN transactions.transaction_type IS 'Type of transaction: income adds to category balances, expense subtracts from category balances';

