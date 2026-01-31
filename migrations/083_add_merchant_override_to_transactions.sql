-- Migration: 083_add_merchant_override_to_transactions.sql
-- Description: Add merchant_override_id to transactions table to allow users to override global merchant assignments
-- Date: 2026-01-31

BEGIN;

-- Add merchant_override_id column to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS merchant_override_id BIGINT REFERENCES global_merchants(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_override_id ON transactions(merchant_override_id);

-- Add comment explaining the column
COMMENT ON COLUMN transactions.merchant_override_id IS 'Allows users to override the global merchant assignment for individual transactions. When set, this merchant takes precedence over the automatic assignment from global merchants.';

COMMIT;
