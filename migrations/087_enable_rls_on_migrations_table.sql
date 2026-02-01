-- Migration: 087_enable_rls_on_migrations_table.sql
-- Description: Enable RLS on _migrations table to fix Supabase security linting error
-- Date: 2026-02-01

-- Ensure the _migrations table exists (idempotent)
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  migration_name TEXT NOT NULL UNIQUE,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on the _migrations table
ALTER TABLE _migrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Deny all access to _migrations via PostgREST" ON _migrations;

-- Create a restrictive policy that denies all access from PostgREST roles
-- This prevents the table from being accessible via the Supabase API
-- Note: Migrations run with direct PostgreSQL connection (service role) which bypasses RLS
CREATE POLICY "Deny all access to _migrations via PostgREST" ON _migrations
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Grant necessary permissions to service role (for migrations)
-- Service role bypasses RLS, but we ensure it has the necessary permissions
GRANT ALL ON _migrations TO service_role;
