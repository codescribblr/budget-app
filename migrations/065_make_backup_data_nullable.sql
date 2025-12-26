-- Migration: 065_make_backup_data_nullable.sql
-- Description: Make backup_data column nullable since new backups use storage_path
-- Date: 2025-01-XX

BEGIN;

-- Make backup_data nullable since new backups use storage_path instead
-- Old backups may still have backup_data, but new backups will have NULL
ALTER TABLE user_backups ALTER COLUMN backup_data DROP NOT NULL;

-- Update comment
COMMENT ON COLUMN user_backups.backup_data IS 'DEPRECATED: Legacy JSONB storage. New backups use storage_path. Can be NULL for new backups stored in Storage.';

COMMIT;

