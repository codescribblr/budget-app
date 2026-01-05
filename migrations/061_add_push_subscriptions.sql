-- Migration: 061_add_push_subscriptions.sql
-- Description: Add push subscription support for PWA notifications
-- Date: 2025-01-XX

BEGIN;

-- Create push_subscriptions table to store user's push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own push subscriptions" 
ON push_subscriptions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions" 
ON push_subscriptions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions" 
ON push_subscriptions FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions" 
ON push_subscriptions FOR DELETE 
USING (auth.uid() = user_id);

-- Add push_enabled column to user_notification_preferences
ALTER TABLE user_notification_preferences 
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT TRUE;

-- Update notification_types to include default_push_enabled
ALTER TABLE notification_types 
ADD COLUMN IF NOT EXISTS default_push_enabled BOOLEAN DEFAULT TRUE;

-- Set default push enabled for existing notification types
UPDATE notification_types 
SET default_push_enabled = TRUE 
WHERE default_push_enabled IS NULL;

COMMIT;


