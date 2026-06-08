-- Migration: 073_backfill_global_merchant_patterns.sql
-- Description: Backfill global merchant patterns from existing transactions
-- Date: 2025-01-XX

BEGIN;

-- Backfill global merchant patterns from all existing transactions
-- This uses the existing upsert_global_merchant_pattern function which handles
-- deduplication and usage counting automatically
DO $$
DECLARE
  transaction_record RECORD;
  processed_count INTEGER := 0;
  total_count INTEGER;
  error_count INTEGER := 0;
  error_message TEXT;
BEGIN
  -- Get total count for progress tracking
  SELECT COUNT(*) INTO total_count
  FROM transactions
  WHERE description IS NOT NULL 
    AND trim(description) != '';

  IF total_count = 0 THEN
    RAISE NOTICE 'No transactions found to process';
    RETURN;
  END IF;

  RAISE NOTICE 'Starting backfill of global merchant patterns from % transactions', total_count;

  -- Process each unique transaction description
  -- We process unique descriptions to avoid redundant processing
  FOR transaction_record IN
    SELECT DISTINCT description
    FROM transactions
    WHERE description IS NOT NULL 
      AND trim(description) != ''
    ORDER BY description
  LOOP
    BEGIN
      -- Use the existing function to upsert the pattern
      -- This will create new patterns or update existing ones with usage counts
      PERFORM upsert_global_merchant_pattern(transaction_record.description);
      
      processed_count := processed_count + 1;
      
      -- Log progress every 1000 records
      IF processed_count % 1000 = 0 THEN
        RAISE NOTICE 'Processed % of % transaction descriptions', processed_count, total_count;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        error_message := SQLERRM;
        RAISE WARNING 'Error processing description "%": %', transaction_record.description, error_message;
        -- Continue processing other transactions
    END;
  END LOOP;

  RAISE NOTICE 'Completed backfill: processed % unique transaction descriptions (errors: %)', processed_count, error_count;
  
  IF error_count > 0 THEN
    RAISE WARNING 'Backfill completed with % errors. Check logs above for details.', error_count;
  END IF;
END $$;

-- Update usage counts to reflect actual transaction counts per pattern
-- The upsert function sets usage_count to 1 for each unique description,
-- but we want the actual count of transactions with that description
-- Only run this if patterns exist
DO $$
DECLARE
  pattern_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pattern_count FROM global_merchant_patterns;
  
  IF pattern_count > 0 THEN
    RAISE NOTICE 'Updating usage counts for % patterns', pattern_count;
    
    UPDATE global_merchant_patterns gmp
    SET usage_count = (
      SELECT COUNT(*)
      FROM transactions t
      WHERE t.description = gmp.pattern
        OR normalize_merchant_pattern(t.description) = gmp.normalized_pattern
    ),
    last_seen_at = (
      SELECT MAX(created_at)
      FROM transactions t
      WHERE t.description = gmp.pattern
        OR normalize_merchant_pattern(t.description) = gmp.normalized_pattern
    ),
    first_seen_at = (
      SELECT MIN(created_at)
      FROM transactions t
      WHERE t.description = gmp.pattern
        OR normalize_merchant_pattern(t.description) = gmp.normalized_pattern
    );
    
    RAISE NOTICE 'Usage counts updated successfully';
  ELSE
    RAISE NOTICE 'No patterns found to update usage counts';
  END IF;
END $$;

COMMIT;
