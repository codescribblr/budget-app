-- Migration: 060_add_notifications_insert_policy.sql
-- Description: Add INSERT policy for notifications table to allow users to create notifications
-- Date: 2025-01-XX

BEGIN;

-- Add INSERT policy for notifications
-- Users can insert notifications for themselves (system creates notifications on behalf of users)
CREATE POLICY "Users can insert their own notifications" 
ON notifications FOR INSERT 
WITH CHECK (auth.uid() = user_id);

COMMIT;

