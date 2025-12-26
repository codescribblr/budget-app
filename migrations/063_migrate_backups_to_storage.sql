-- Migration: 063_migrate_backups_to_storage.sql
-- Description: Migrate backups from JSONB to Supabase Storage with compression support
-- Date: 2025-01-XX

BEGIN;

-- Add storage_path column for Supabase Storage file path
ALTER TABLE user_backups ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Create index for storage_path lookups
CREATE INDEX IF NOT EXISTS idx_user_backups_storage_path ON user_backups(storage_path) WHERE storage_path IS NOT NULL;

-- Note: backup_data column is kept for backward compatibility during migration
-- It will be removed in a future migration after all backups are migrated

-- Update comment
COMMENT ON TABLE user_backups IS 'Stores user data backups. Backups are stored in Supabase Storage (compressed) and referenced by storage_path. Free tier: 3 backups, Premium: 10 backups.';
COMMENT ON COLUMN user_backups.storage_path IS 'Path to compressed backup file in Supabase Storage (backups bucket)';
COMMENT ON COLUMN user_backups.backup_data IS 'DEPRECATED: Legacy JSONB storage. New backups use storage_path. Will be removed in future migration.';

COMMIT;

