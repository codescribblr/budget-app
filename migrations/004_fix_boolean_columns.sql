-- Migration: 004_fix_boolean_columns.sql
-- Description: Convert INTEGER columns to BOOLEAN for include_in_totals fields
-- Date: 2025-01-15

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
    RAISE NOTICE 'Converted accounts.include_in_totals to BOOLEAN';
  ELSE
    RAISE NOTICE 'accounts.include_in_totals is already BOOLEAN';
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
    RAISE NOTICE 'Converted credit_cards.include_in_totals to BOOLEAN';
  ELSE
    RAISE NOTICE 'credit_cards.include_in_totals is already BOOLEAN';
  END IF;
END $$;

