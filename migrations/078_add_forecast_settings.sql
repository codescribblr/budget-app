-- Migration: 078_add_forecast_settings.sql
-- Description: Add forecast_settings table for storing user forecast parameters
-- Date: 2025-01-29

BEGIN;

-- Create forecast_settings table
CREATE TABLE IF NOT EXISTS forecast_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_forecast_settings_user_id ON forecast_settings(user_id);

-- Enable Row Level Security
ALTER TABLE forecast_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own forecast settings" ON forecast_settings;
DROP POLICY IF EXISTS "Users can insert own forecast settings" ON forecast_settings;
DROP POLICY IF EXISTS "Users can update own forecast settings" ON forecast_settings;

-- RLS Policies for forecast_settings
-- Users can view their own forecast settings
CREATE POLICY "Users can view own forecast settings"
  ON forecast_settings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own forecast settings
CREATE POLICY "Users can insert own forecast settings"
  ON forecast_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own forecast settings
CREATE POLICY "Users can update own forecast settings"
  ON forecast_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_forecast_settings_updated_at ON forecast_settings;
CREATE TRIGGER update_forecast_settings_updated_at
  BEFORE UPDATE ON forecast_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
