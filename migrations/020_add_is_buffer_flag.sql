-- Migration: Add is_buffer flag to categories table
-- This flag identifies the Income Buffer category which is special:
-- - Does NOT show in category dropdowns (like system categories)
-- - DOES count toward total envelopes and Available to Save (unlike system categories)
-- - Only one buffer category should exist per user

-- Add is_buffer column to categories table
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS is_buffer BOOLEAN DEFAULT FALSE;

-- Update existing Income Buffer category to set is_buffer = true
UPDATE categories
SET is_buffer = TRUE
WHERE name = 'Income Buffer' AND is_system = TRUE;

-- Add comment to document the column
COMMENT ON COLUMN categories.is_buffer IS 'Identifies the Income Buffer category. Unlike other system categories, this one counts toward total envelopes and Available to Save calculations, but does not appear in category dropdowns.';


