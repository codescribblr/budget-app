-- Migration: 036_add_check_type_to_pending_checks.sql
-- Description: Add type column to pending_checks table to support both expenses and income
-- Date: 2025-01-16

-- Add type column with default 'expense' for backward compatibility
-- The DEFAULT will set new rows, but we'll explicitly update existing rows below
ALTER TABLE pending_checks
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'expense' CHECK(type IN ('expense', 'income'));

-- Set all existing pending checks to 'expense' (they were all expenses before this feature)
-- This ensures any existing records are properly set, regardless of when they were created
UPDATE pending_checks
SET type = 'expense'
WHERE type IS NULL;

-- Now make the column NOT NULL after we've set all existing values
ALTER TABLE pending_checks
ALTER COLUMN type SET NOT NULL;

