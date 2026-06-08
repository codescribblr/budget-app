-- Migration: 077_add_birth_year_to_user_profiles.sql
-- Description: Add birth_year field to user_profiles table for forecast calculations
-- Date: 2025-01-29

BEGIN;

-- Add birth_year column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS birth_year INTEGER;

-- Add constraint to ensure birth_year is reasonable (between 1900 and current year)
ALTER TABLE user_profiles
ADD CONSTRAINT check_birth_year_range
CHECK (birth_year IS NULL OR (birth_year >= 1900 AND birth_year <= EXTRACT(YEAR FROM NOW())));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_birth_year ON user_profiles(birth_year);

COMMIT;
