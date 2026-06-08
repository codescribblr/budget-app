-- Migration: 062_recurring_transactions_v2.sql
-- Description: Recurring transactions V2 — classification, tracking status, user feedback, missed occurrences
-- Date: 2026-06-08

BEGIN;

ALTER TABLE recurring_transactions
  ADD COLUMN IF NOT EXISTS tracking_status TEXT DEFAULT 'suggested',
  ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dismissed_reason TEXT,
  ADD COLUMN IF NOT EXISTS amount_history JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS date_anchor_type TEXT,
  ADD COLUMN IF NOT EXISTS involuntary_score DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS evidence_score DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS charge_class TEXT,
  ADD COLUMN IF NOT EXISTS detection_path TEXT,
  ADD COLUMN IF NOT EXISTS classification_signals JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS missed_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_missed_date DATE,
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS account_last_seen_date DATE,
  ADD COLUMN IF NOT EXISTS data_stale_at_last_check BOOLEAN DEFAULT FALSE;

-- Migrate existing confirmed records
UPDATE recurring_transactions
SET tracking_status = CASE
  WHEN is_confirmed = TRUE THEN 'confirmed'
  WHEN is_active = FALSE THEN 'inactive'
  ELSE 'suggested'
END
WHERE tracking_status IS NULL OR tracking_status = 'suggested';

ALTER TABLE recurring_transactions
  DROP CONSTRAINT IF EXISTS recurring_transactions_tracking_status_check;

ALTER TABLE recurring_transactions
  ADD CONSTRAINT recurring_transactions_tracking_status_check
  CHECK (tracking_status IN ('suggested', 'confirmed', 'paused', 'dismissed', 'inactive'));

CREATE TABLE IF NOT EXISTS recurring_user_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  budget_account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE NOT NULL,
  merchant_group_id BIGINT REFERENCES merchant_groups(id) ON DELETE CASCADE NOT NULL,
  amount_bucket INTEGER,
  frequency TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('confirmed', 'dismissed')),
  charge_class TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, budget_account_id, merchant_group_id, amount_bucket, frequency, feedback_type)
);

CREATE INDEX IF NOT EXISTS idx_recurring_user_feedback_lookup
  ON recurring_user_feedback(user_id, budget_account_id, merchant_group_id);

CREATE TABLE IF NOT EXISTS recurring_missed_occurrences (
  id BIGSERIAL PRIMARY KEY,
  recurring_transaction_id BIGINT REFERENCES recurring_transactions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  budget_account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE NOT NULL,
  expected_date DATE NOT NULL,
  grace_end_date DATE NOT NULL,
  missed_confidence TEXT NOT NULL DEFAULT 'high'
    CHECK (missed_confidence IN ('low', 'high')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'snoozed_import', 'user_canceled', 'found', 'auto_resolved', 'dismissed')),
  user_response TEXT,
  snoozed_until DATE,
  notified_at TIMESTAMPTZ,
  notified_count INTEGER DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recurring_transaction_id, expected_date)
);

CREATE INDEX IF NOT EXISTS idx_recurring_missed_occurrences_open
  ON recurring_missed_occurrences(recurring_transaction_id, status)
  WHERE status = 'open';

ALTER TABLE recurring_user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_missed_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their recurring feedback" ON recurring_user_feedback
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their missed occurrences" ON recurring_missed_occurrences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their missed occurrences" ON recurring_missed_occurrences
  FOR UPDATE USING (user_id = auth.uid());

COMMIT;
