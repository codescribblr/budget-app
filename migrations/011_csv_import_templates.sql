-- Migration: 011_csv_import_templates.sql
-- Description: Add CSV import templates table for storing column mappings
-- Date: 2025-01-20

CREATE TABLE IF NOT EXISTS csv_import_templates (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name VARCHAR(255),
  fingerprint VARCHAR(255) NOT NULL,
  column_count INTEGER NOT NULL,
  date_column INTEGER,
  amount_column INTEGER,
  description_column INTEGER,
  debit_column INTEGER,
  credit_column INTEGER,
  date_format VARCHAR(50),
  has_headers BOOLEAN DEFAULT true,
  skip_rows INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, fingerprint)
);

-- Create index for faster template lookups
CREATE INDEX IF NOT EXISTS idx_csv_import_templates_user_id ON csv_import_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_csv_import_templates_fingerprint ON csv_import_templates(fingerprint);

-- Enable Row Level Security
ALTER TABLE csv_import_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own templates"
  ON csv_import_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates"
  ON csv_import_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON csv_import_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON csv_import_templates FOR DELETE
  USING (auth.uid() = user_id);


