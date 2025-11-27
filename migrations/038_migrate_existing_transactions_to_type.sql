-- Migration: 038_migrate_existing_transactions_to_type.sql
-- Description: Migrate existing transactions: negative amounts → income, positive → expense
-- Date: 2025-01-20
-- IMPORTANT: This migration does NOT recalculate category balances
-- It only adds the transaction_type metadata based on current amount signs

-- Strategy: 
-- 1. Transactions with negative total_amount → income (then make amount positive)
-- 2. Transactions with positive total_amount → expense (keep positive)
-- 3. Update transaction_splits amounts to be positive (absolute value)

BEGIN;

-- Step 1: Update transactions table
-- Mark negative amounts as income, positive as expense
-- Note: All existing rows have transaction_type = 'expense' (the default), so this updates all rows on first run
-- The WHERE clause makes the migration idempotent - it won't re-process already migrated rows
UPDATE transactions
SET transaction_type = CASE 
  WHEN total_amount < 0 THEN 'income'
  ELSE 'expense'
END,
total_amount = ABS(total_amount)
WHERE total_amount < 0 OR (transaction_type = 'expense' AND total_amount >= 0); -- Update negative amounts or unmigrated positive rows

-- Step 2: Update transaction_splits amounts to be positive
-- This ensures consistency: all amounts stored as positive, type determines behavior
UPDATE transaction_splits
SET amount = ABS(amount);

-- Verify: Check that all amounts are now positive
DO $$
DECLARE
  negative_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO negative_count
  FROM transactions
  WHERE total_amount < 0;
  
  IF negative_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: Found % transactions with negative amounts', negative_count;
  END IF;
END $$;

COMMIT;

