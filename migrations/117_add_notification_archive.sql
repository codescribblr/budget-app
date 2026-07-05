-- Migration: 117_add_notification_archive.sql
-- Description: Archive notifications instead of deleting them
-- Date: 2026-07-05

BEGIN;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_active
  ON notifications(user_id, created_at DESC)
  WHERE is_archived = FALSE AND in_app_created = TRUE;

CREATE INDEX IF NOT EXISTS idx_notifications_archived
  ON notifications(user_id, archived_at DESC)
  WHERE is_archived = TRUE AND in_app_created = TRUE;

COMMIT;
