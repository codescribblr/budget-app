-- Migration: 040_fix_remaining_negative_transaction_amounts.sql
-- Description: Fix any remaining transactions with negative amounts by converting them to income
-- Date: 2025-01-27
-- IMPORTANT: This migration does NOT recalculate category balances
-- Converting negative expense to positive income has the same net effect on balances

-- Strategy:
-- 1. Find all transactions with negative total_amount (regardless of transaction_type)
-- 2. Convert them to income transactions with positive amounts
-- 3. Update transaction_splits amounts to be positive (absolute value)
-- 4. This is safe because: negative expense = positive income (same balance effect)

BEGIN;

-- Step 1: Update transactions with negative amounts
-- Convert them to income with positive amounts
-- This catches any transactions that were missed by migration 038 or imported after it ran
UPDATE transactions
SET transaction_type = 'income',
    total_amount = ABS(total_amount)
WHERE total_amount < 0;

-- Step 2: Update transaction_splits for transactions that were just converted
-- Make sure all split amounts are positive
UPDATE transaction_splits
SET amount = ABS(amount)
WHERE transaction_id IN (
    SELECT id FROM transactions WHERE transaction_type = 'income'
)
AND amount < 0;

-- Verify: Check that all amounts are now positive
DO $$
DECLARE
    negative_transaction_count INTEGER;
    negative_split_count INTEGER;
BEGIN
    -- Check transactions
    SELECT COUNT(*) INTO negative_transaction_count
    FROM transactions
    WHERE total_amount < 0;
    
    -- Check splits
    SELECT COUNT(*) INTO negative_split_count
    FROM transaction_splits
    WHERE amount < 0;
    
    IF negative_transaction_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: Found % transactions with negative amounts', negative_transaction_count;
    END IF;
    
    IF negative_split_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: Found % transaction splits with negative amounts', negative_split_count;
    END IF;
    
    RAISE NOTICE 'Migration successful: All transaction amounts are now positive';
END $$;

COMMIT;

