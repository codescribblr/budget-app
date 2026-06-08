-- Migration: 006_create_user_backups_table.sql
-- Description: Create user_backups table for storing user data backups

-- Create user_backups table
CREATE TABLE IF NOT EXISTS user_backups (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  backup_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add index for user_id to speed up queries
CREATE INDEX IF NOT EXISTS idx_user_backups_user_id ON user_backups(user_id);

-- Add index for created_at to speed up sorting
CREATE INDEX IF NOT EXISTS idx_user_backups_created_at ON user_backups(created_at DESC);

-- Add RLS policies
ALTER TABLE user_backups ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own backups
CREATE POLICY "Users can view own backups"
  ON user_backups
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only create their own backups
CREATE POLICY "Users can create own backups"
  ON user_backups
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own backups
CREATE POLICY "Users can delete own backups"
  ON user_backups
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment to explain the table
COMMENT ON TABLE user_backups IS 'Stores user data backups in JSON format. Each user can have up to 3 backups.';
COMMENT ON COLUMN user_backups.backup_data IS 'JSON object containing all user data: accounts, categories, transactions, etc.';


