-- Migration: 004_fix_boolean_columns.sql
-- Description: Convert INTEGER columns to BOOLEAN for include_in_totals fields
-- Date: 2025-01-15

-- Fix accounts.include_in_totals (INTEGER -> BOOLEAN)
ALTER TABLE accounts 
  ALTER COLUMN include_in_totals TYPE BOOLEAN 
  USING (include_in_totals::INTEGER != 0);

-- Fix credit_cards.include_in_totals (INTEGER -> BOOLEAN)
ALTER TABLE credit_cards 
  ALTER COLUMN include_in_totals TYPE BOOLEAN 
  USING (include_in_totals::INTEGER != 0);

