-- Migration: 005_add_is_historical_to_transactions.sql
-- Description: Add is_historical flag to transactions table to support importing historical data without affecting current balances
-- Date: 2025-01-15

-- Add is_historical column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_historical BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for filtering historical vs current transactions
CREATE INDEX IF NOT EXISTS idx_transactions_is_historical ON transactions(is_historical);

-- Add comment to explain the column
COMMENT ON COLUMN transactions.is_historical IS 'When true, this transaction does not affect category envelope balances. Used for importing historical data for reporting/trends without impacting current budgets.';


