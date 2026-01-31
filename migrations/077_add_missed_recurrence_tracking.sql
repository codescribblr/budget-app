-- Migration: 077_add_missed_recurrence_tracking.sql
-- Description: Add fields to track missed recurrences for better pattern deactivation
-- Date: 2026-01-30

BEGIN;

-- Add missed recurrence tracking fields
ALTER TABLE recurring_transactions
ADD COLUMN IF NOT EXISTS missed_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_missed_date DATE,
ADD COLUMN IF NOT EXISTS status_reason TEXT;

-- Add comment to document the columns
COMMENT ON COLUMN recurring_transactions.missed_streak IS 'Number of consecutive missed expected occurrences. Pattern is deactivated when this reaches 2.';
COMMENT ON COLUMN recurring_transactions.last_missed_date IS 'Date of the most recent missed expected occurrence.';
COMMENT ON COLUMN recurring_transactions.status_reason IS 'Reason for pattern status (e.g., "missed_twice", "manual_pause", "detection_update").';

COMMIT;
