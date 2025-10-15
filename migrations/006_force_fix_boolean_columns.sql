-- Migration: 006_force_fix_boolean_columns.sql
-- Description: Force convert include_in_totals columns to BOOLEAN if they're still INTEGER
-- Date: 2025-10-15
-- Reason: Migration 004 may have been skipped if columns were already correct

-- Fix accounts.include_in_totals (INTEGER -> BOOLEAN)
DO $$ 
BEGIN
  -- Check if column is not already boolean
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'accounts' 
      AND column_name = 'include_in_totals'
      AND data_type != 'boolean'
  ) THEN
    ALTER TABLE accounts 
      ALTER COLUMN include_in_totals TYPE BOOLEAN 
      USING (include_in_totals::INTEGER != 0);
    RAISE NOTICE 'Converted accounts.include_in_totals from INTEGER to BOOLEAN';
  ELSE
    RAISE NOTICE 'accounts.include_in_totals is already BOOLEAN (data_type: %)', 
      (SELECT data_type FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'accounts' 
       AND column_name = 'include_in_totals');
  END IF;
END $$;

-- Fix credit_cards.include_in_totals (INTEGER -> BOOLEAN)
DO $$ 
BEGIN
  -- Check if column is not already boolean
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'credit_cards' 
      AND column_name = 'include_in_totals'
      AND data_type != 'boolean'
  ) THEN
    ALTER TABLE credit_cards 
      ALTER COLUMN include_in_totals TYPE BOOLEAN 
      USING (include_in_totals::INTEGER != 0);
    RAISE NOTICE 'Converted credit_cards.include_in_totals from INTEGER to BOOLEAN';
  ELSE
    RAISE NOTICE 'credit_cards.include_in_totals is already BOOLEAN (data_type: %)', 
      (SELECT data_type FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'credit_cards' 
       AND column_name = 'include_in_totals');
  END IF;
END $$;

