-- Migration: 069_add_global_merchants.sql
-- Description: Add global merchants tables for admin-managed merchant definitions
-- Date: 2025-01-XX

BEGIN;

-- Create global_merchants table (similar to merchant_groups but global)
CREATE TABLE IF NOT EXISTS global_merchants (
  id BIGSERIAL PRIMARY KEY,
  display_name VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft')),
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create global_merchant_patterns table (similar to merchant_mappings but global)
CREATE TABLE IF NOT EXISTS global_merchant_patterns (
  id BIGSERIAL PRIMARY KEY,
  global_merchant_id BIGINT REFERENCES global_merchants(id) ON DELETE SET NULL,
  pattern VARCHAR(500) NOT NULL UNIQUE,
  normalized_pattern VARCHAR(500) NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_global_merchants_status ON global_merchants(status);
CREATE INDEX IF NOT EXISTS idx_global_merchants_display_name ON global_merchants(display_name);
CREATE INDEX IF NOT EXISTS idx_global_merchant_patterns_merchant_id ON global_merchant_patterns(global_merchant_id);
CREATE INDEX IF NOT EXISTS idx_global_merchant_patterns_pattern ON global_merchant_patterns(pattern);
CREATE INDEX IF NOT EXISTS idx_global_merchant_patterns_normalized_pattern ON global_merchant_patterns(normalized_pattern);
CREATE INDEX IF NOT EXISTS idx_global_merchant_patterns_usage_count ON global_merchant_patterns(usage_count DESC);

-- Enable Row Level Security
ALTER TABLE global_merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_merchant_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for global_merchants
-- Everyone can view active merchants (for transaction mapping)
CREATE POLICY "Anyone can view active global merchants"
  ON global_merchants FOR SELECT
  USING (status = 'active');

-- Only admins can view draft merchants
CREATE POLICY "Admins can view draft global merchants"
  ON global_merchants FOR SELECT
  USING (
    status = 'draft' AND
    is_current_user_admin()
  );

-- Only admins can insert/update/delete global merchants
CREATE POLICY "Admins can insert global merchants"
  ON global_merchants FOR INSERT
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update global merchants"
  ON global_merchants FOR UPDATE
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete global merchants"
  ON global_merchants FOR DELETE
  USING (is_current_user_admin());

-- RLS Policies for global_merchant_patterns
-- Everyone can view patterns for active merchants
CREATE POLICY "Anyone can view patterns for active merchants"
  ON global_merchant_patterns FOR SELECT
  USING (
    global_merchant_id IS NULL OR
    EXISTS (
      SELECT 1 FROM global_merchants
      WHERE id = global_merchant_patterns.global_merchant_id
      AND status = 'active'
    )
  );

-- Admins can view all patterns
CREATE POLICY "Admins can view all global merchant patterns"
  ON global_merchant_patterns FOR SELECT
  USING (is_current_user_admin());

-- System can insert patterns (via trigger) - SECURITY DEFINER functions bypass RLS
-- But we still need a policy for the trigger to work
CREATE POLICY "System can insert global merchant patterns"
  ON global_merchant_patterns FOR INSERT
  WITH CHECK (true); -- Allow all inserts (trigger uses SECURITY DEFINER)

-- Only admins can update/delete patterns
CREATE POLICY "Admins can update global merchant patterns"
  ON global_merchant_patterns FOR UPDATE
  USING (is_current_user_admin());

CREATE POLICY "Admins can delete global merchant patterns"
  ON global_merchant_patterns FOR DELETE
  USING (is_current_user_admin());

-- Function to normalize merchant pattern (same logic as account-level merchants)
CREATE OR REPLACE FUNCTION normalize_merchant_pattern(pattern_text TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Convert to lowercase and remove extra spaces
  RETURN lower(trim(regexp_replace(pattern_text, '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to create or update global merchant pattern from transaction description
CREATE OR REPLACE FUNCTION upsert_global_merchant_pattern(description_text TEXT)
RETURNS void AS $$
DECLARE
  normalized_desc TEXT;
  existing_pattern_id BIGINT;
BEGIN
  -- Normalize the description
  normalized_desc := normalize_merchant_pattern(description_text);
  
  -- Try to find existing pattern (exact match)
  SELECT id INTO existing_pattern_id
  FROM global_merchant_patterns
  WHERE pattern = description_text OR normalized_pattern = normalized_desc
  LIMIT 1;
  
  IF existing_pattern_id IS NOT NULL THEN
    -- Update existing pattern: increment usage count and update last_seen_at
    UPDATE global_merchant_patterns
    SET 
      usage_count = usage_count + 1,
      last_seen_at = NOW(),
      updated_at = NOW()
    WHERE id = existing_pattern_id;
  ELSE
    -- Insert new pattern
    INSERT INTO global_merchant_patterns (pattern, normalized_pattern, usage_count, first_seen_at, last_seen_at)
    VALUES (description_text, normalized_desc, 1, NOW(), NOW())
    ON CONFLICT (pattern) DO UPDATE
    SET 
      usage_count = global_merchant_patterns.usage_count + 1,
      last_seen_at = NOW(),
      updated_at = NOW();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to automatically create/update global merchant patterns when transactions are created
CREATE OR REPLACE FUNCTION on_transaction_created_global_merchant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if description is not empty
  IF NEW.description IS NOT NULL AND trim(NEW.description) != '' THEN
    -- Upsert the global merchant pattern
    PERFORM upsert_global_merchant_pattern(NEW.description);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on transactions table
DROP TRIGGER IF EXISTS trigger_transaction_created_global_merchant ON transactions;
CREATE TRIGGER trigger_transaction_created_global_merchant
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION on_transaction_created_global_merchant();

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_global_merchants_updated_at ON global_merchants;
CREATE TRIGGER update_global_merchants_updated_at
  BEFORE UPDATE ON global_merchants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_global_merchant_patterns_updated_at ON global_merchant_patterns;
CREATE TRIGGER update_global_merchant_patterns_updated_at
  BEFORE UPDATE ON global_merchant_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
