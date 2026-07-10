-- Migration: 119_rentcast_value_preference_and_schedule_fix.sql
-- Description: Let users choose estimate/low/high for stored property value;
--              fix rentcast_sync job that was accidentally rescheduling daily.
-- Date: 2026-07-10

BEGIN;

-- Preferred RentCast figure to apply as non_cash_assets.current_value
ALTER TABLE non_cash_assets
  ADD COLUMN IF NOT EXISTS rentcast_value_preference TEXT NOT NULL DEFAULT 'estimate';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'non_cash_assets_rentcast_value_preference_check'
  ) THEN
    ALTER TABLE non_cash_assets
      ADD CONSTRAINT non_cash_assets_rentcast_value_preference_check
      CHECK (rentcast_value_preference IN ('estimate', 'low', 'high'));
  END IF;
END $$;

COMMENT ON COLUMN non_cash_assets.rentcast_value_preference IS
  'Which RentCast figure to store as current_value: estimate (price), low (priceRangeLow), or high (priceRangeHigh).';

-- Reschedule any pending rentcast_sync jobs that fell into the daily default.
-- Next run: 1st of next month at 09:00 UTC (matches intended "0 9 1 * *" schedule).
UPDATE scheduled_jobs
SET
  scheduled_for = (
    date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))
    + INTERVAL '1 month'
    + INTERVAL '9 hours'
  ),
  metadata = COALESCE(metadata, '{}'::jsonb) || '{"schedule": "0 9 1 * *"}'::jsonb,
  updated_at = NOW()
WHERE job_type = 'rentcast_sync'
  AND status = 'pending';

COMMIT;
