-- Migration: 082_add_send_email_to_admin_notifications.sql
-- Description: Add send_email flag to admin_notifications table
-- Date: 2025-01-30

BEGIN;

-- Add send_email column to admin_notifications table
ALTER TABLE admin_notifications
ADD COLUMN IF NOT EXISTS send_email BOOLEAN NOT NULL DEFAULT TRUE;

COMMIT;
