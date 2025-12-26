-- Migration: 058_add_notification_system.sql
-- Description: Add generic notification system for all features
-- Date: 2025-01-XX

BEGIN;

-- Create notification_types table (reference table)
CREATE TABLE IF NOT EXISTS notification_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  default_enabled BOOLEAN DEFAULT TRUE,
  default_email_enabled BOOLEAN DEFAULT TRUE,
  default_in_app_enabled BOOLEAN DEFAULT TRUE,
  requires_account_context BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_notification_preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type_id TEXT REFERENCES notification_types(id) ON DELETE CASCADE NOT NULL,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, notification_type_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  budget_account_id BIGINT REFERENCES budget_accounts(id) ON DELETE SET NULL,
  notification_type_id TEXT REFERENCES notification_types(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  action_label TEXT,
  metadata JSONB DEFAULT '{}',
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  email_error TEXT,
  in_app_created BOOLEAN DEFAULT FALSE,
  in_app_created_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notification_delivery_log table (optional, for debugging)
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id BIGSERIAL PRIMARY KEY,
  notification_id BIGINT REFERENCES notifications(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'in_app')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_user_id ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_type_id ON user_notification_preferences(notification_type_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_account_id ON notifications(budget_account_id) WHERE budget_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type_id ON notifications(notification_type_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for) WHERE scheduled_for IS NOT NULL AND sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_notification_id ON notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_status ON notification_delivery_log(status, attempted_at);

-- Enable RLS
ALTER TABLE notification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_types (public read)
CREATE POLICY "Anyone can view notification types" ON notification_types FOR SELECT USING (true);

-- RLS Policies for user_notification_preferences
CREATE POLICY "Users can view their own notification preferences" ON user_notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own notification preferences" ON user_notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notification preferences" ON user_notification_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notification preferences" ON user_notification_preferences FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for notification_delivery_log
CREATE POLICY "Users can view delivery logs for their notifications" ON notification_delivery_log FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM notifications
    WHERE notifications.id = notification_delivery_log.notification_id
    AND notifications.user_id = auth.uid()
  )
);

-- Seed notification types
INSERT INTO notification_types (id, name, description, category, default_enabled, default_email_enabled, default_in_app_enabled, requires_account_context) VALUES
-- Recurring Transactions
('recurring_transaction_upcoming', 'Upcoming Recurring Transaction', 'Alert before a recurring transaction is due', 'recurring_transactions', TRUE, TRUE, TRUE, TRUE),
('recurring_transaction_insufficient_funds', 'Insufficient Funds for Recurring Transaction', 'Alert when account balance is too low for upcoming recurring transaction', 'recurring_transactions', TRUE, TRUE, TRUE, TRUE),
('recurring_transaction_missed', 'Missed Recurring Transaction', 'Alert when expected recurring transaction did not occur', 'recurring_transactions', TRUE, FALSE, TRUE, TRUE),
('recurring_transaction_amount_changed', 'Recurring Transaction Amount Changed', 'Alert when recurring transaction amount changes significantly', 'recurring_transactions', TRUE, FALSE, TRUE, TRUE),
-- Subscriptions (future)
('subscription_trial_ending', 'Trial Ending Soon', 'Alert before subscription trial ends', 'subscriptions', TRUE, TRUE, TRUE, FALSE),
('subscription_payment_failed', 'Subscription Payment Failed', 'Alert when subscription payment fails', 'subscriptions', TRUE, TRUE, TRUE, FALSE),
-- Budget Alerts (future)
('budget_category_over_limit', 'Category Over Budget', 'Alert when spending exceeds category budget', 'budget_alerts', TRUE, FALSE, TRUE, TRUE),
('budget_low_balance', 'Low Account Balance', 'Alert when account balance falls below threshold', 'budget_alerts', TRUE, TRUE, TRUE, TRUE),
-- System (future)
('import_completed', 'Import Completed', 'Alert when transaction import finishes', 'system', TRUE, FALSE, TRUE, TRUE),
('collaborator_invited', 'Collaborator Invited', 'Alert when you are invited to collaborate', 'system', TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

COMMIT;



