-- Migration: 114_add_budget_alerts_and_recurring_new_notification.sql
-- Description: Add recurring_transaction_new notification type and check_budget_alerts scheduled job
-- Date: 2026-06-09

BEGIN;

INSERT INTO notification_types (id, name, description, category, default_enabled, default_email_enabled, default_in_app_enabled, requires_account_context) VALUES
('recurring_transaction_new', 'New Recurring Pattern Detected', 'Alert when a new recurring transaction pattern is automatically detected', 'recurring_transactions', TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Daily budget alert check (low balance scan + category over budget catch-up)
DO $$
DECLARE
  next_daily_run TIMESTAMPTZ;
BEGIN
  next_daily_run := DATE_TRUNC('day', NOW() + INTERVAL '1 day') + INTERVAL '8 hours';

  INSERT INTO scheduled_jobs (job_type, status, scheduled_for, metadata)
  SELECT 'check_budget_alerts', 'pending', next_daily_run, '{"schedule": "0 8 * * *"}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM scheduled_jobs WHERE job_type = 'check_budget_alerts' AND status = 'pending'
  );
END $$;

COMMIT;
