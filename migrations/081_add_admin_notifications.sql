-- Migration: 081_add_admin_notifications.sql
-- Description: Add admin notifications system for sending notifications to users
-- Date: 2025-01-30

BEGIN;

-- Add system_notification type to notification_types
INSERT INTO notification_types (id, name, description, category, default_enabled, default_email_enabled, default_in_app_enabled, requires_account_context) 
VALUES (
  'system_notification',
  'System Notifications',
  'General system notifications and announcements from administrators',
  'system',
  TRUE,
  TRUE,
  TRUE,
  FALSE
)
ON CONFLICT (id) DO NOTHING;

-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id BIGSERIAL PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Rich HTML content from WYSIWYG editor
  
  -- Push notification customization (optional)
  push_title TEXT, -- If null, uses default "You have new notifications"
  push_body TEXT, -- If null, uses default message
  
  -- Target configuration
  target_type TEXT NOT NULL CHECK (target_type IN ('global', 'account', 'user')),
  target_id TEXT, -- account_id (as text) for 'account', user_id (UUID as text) for 'user', NULL for 'global'
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
  sent_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create admin_notification_recipients table to track delivery
CREATE TABLE IF NOT EXISTS admin_notification_recipients (
  id BIGSERIAL PRIMARY KEY,
  admin_notification_id BIGINT REFERENCES admin_notifications(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  budget_account_id BIGINT REFERENCES budget_accounts(id) ON DELETE SET NULL,
  
  -- Delivery status
  notification_id BIGINT REFERENCES notifications(id) ON DELETE SET NULL, -- Link to actual notification sent
  push_sent BOOLEAN DEFAULT FALSE,
  push_sent_at TIMESTAMPTZ,
  
  -- Read status (from notifications table, but cached here for quick queries)
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(admin_notification_id, user_id, budget_account_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_by ON admin_notifications(created_by);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_status ON admin_notifications(status);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_target ON admin_notifications(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notification_recipients_notification_id ON admin_notification_recipients(admin_notification_id);
CREATE INDEX IF NOT EXISTS idx_admin_notification_recipients_user_id ON admin_notification_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notification_recipients_account_id ON admin_notification_recipients(budget_account_id) WHERE budget_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_notification_recipients_read ON admin_notification_recipients(admin_notification_id, is_read);

-- Enable RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notification_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_notifications
-- Only admins can view/create/update/delete admin notifications
CREATE POLICY "Admins can view admin notifications" ON admin_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can create admin notifications" ON admin_notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can update admin notifications" ON admin_notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = TRUE
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can delete admin notifications" ON admin_notifications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = TRUE
    )
  );

-- RLS Policies for admin_notification_recipients
-- Admins can view all recipients
-- Users can view their own recipients
CREATE POLICY "Admins can view all recipients" ON admin_notification_recipients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = TRUE
    )
  );

CREATE POLICY "Users can view their own recipients" ON admin_notification_recipients
  FOR SELECT USING (user_id = auth.uid());

-- Note: Recipients are created by admin service role, so no INSERT policy needed
-- Updates to read status happen via the notifications table

COMMIT;
