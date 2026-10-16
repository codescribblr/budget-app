-- Migration: 122_add_admin_api_keys_and_merchant_agent.sql
-- Description: Admin API keys (shared), merchant agent audit trail, stronger merchant pattern normalization
-- Date: 2026-10-16

BEGIN;

-- =============================================================================
-- 1. Admin API keys (shared across admins; hash-only storage)
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  -- Previous secret kept temporarily after rotation (grace period)
  previous_key_prefix TEXT,
  previous_key_hash TEXT,
  previous_key_valid_until TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_api_keys_key_prefix
  ON admin_api_keys(key_prefix) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_admin_api_keys_previous_key_prefix
  ON admin_api_keys(previous_key_prefix)
  WHERE previous_key_prefix IS NOT NULL AND revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_admin_api_keys_created_by ON admin_api_keys(created_by);

ALTER TABLE admin_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin api keys" ON admin_api_keys;
DROP POLICY IF EXISTS "Admins can insert admin api keys" ON admin_api_keys;
DROP POLICY IF EXISTS "Admins can update admin api keys" ON admin_api_keys;

CREATE POLICY "Admins can view admin api keys"
  ON admin_api_keys FOR SELECT
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert admin api keys"
  ON admin_api_keys FOR INSERT
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update admin api keys"
  ON admin_api_keys FOR UPDATE
  USING (is_current_user_admin());

-- No DELETE policy: revoke via update only. Service role bypasses RLS for auth lookups.

DROP TRIGGER IF EXISTS update_admin_api_keys_updated_at ON admin_api_keys;
CREATE TRIGGER update_admin_api_keys_updated_at
  BEFORE UPDATE ON admin_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE admin_api_keys IS 'Shared admin API keys for /api/admin/v1. Secrets stored as SHA-256 hashes; plaintext shown once.';

-- =============================================================================
-- 2. Merchant agent action audit trail
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_merchant_agent_actions (
  id BIGSERIAL PRIMARY KEY,
  admin_api_key_id UUID REFERENCES admin_api_keys(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(64) NOT NULL,
  global_merchant_id BIGINT REFERENCES global_merchants(id) ON DELETE SET NULL,
  pattern_ids BIGINT[] NOT NULL DEFAULT '{}',
  confidence NUMERIC(4,3),
  reasoning TEXT,
  suggestion_id BIGINT REFERENCES global_merchant_suggestions(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_admin_merchant_agent_actions_actor CHECK (
    admin_api_key_id IS NOT NULL OR actor_user_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_admin_merchant_agent_actions_created_at
  ON admin_merchant_agent_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_merchant_agent_actions_key
  ON admin_merchant_agent_actions(admin_api_key_id);
CREATE INDEX IF NOT EXISTS idx_admin_merchant_agent_actions_merchant
  ON admin_merchant_agent_actions(global_merchant_id);

ALTER TABLE admin_merchant_agent_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view merchant agent actions" ON admin_merchant_agent_actions;
DROP POLICY IF EXISTS "Admins can insert merchant agent actions" ON admin_merchant_agent_actions;

CREATE POLICY "Admins can view merchant agent actions"
  ON admin_merchant_agent_actions FOR SELECT
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert merchant agent actions"
  ON admin_merchant_agent_actions FOR INSERT
  WITH CHECK (is_current_user_admin());

COMMENT ON TABLE admin_merchant_agent_actions IS 'Audit log for admin agent auto-approvals and suggestion creates.';

-- =============================================================================
-- 3. Stronger normalize_merchant_pattern (shared with app normalizer intent)
-- Strips dates, store/terminal numbers, processor prefixes, city/state, PURCHASE, etc.
-- =============================================================================

CREATE OR REPLACE FUNCTION normalize_merchant_pattern(pattern_text TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
  strip_location BOOLEAN;
BEGIN
  IF pattern_text IS NULL THEN
    RETURN '';
  END IF;

  result := upper(trim(pattern_text));

  -- Only strip trailing city/state when the string looks like a card purchase
  -- (avoids treating brand fragments like "BRIDGE CITY CO" as City, CO).
  strip_location :=
    result ~ '(PURCHASE|POS|DEBIT|CHECKCARD)'
    OR result ~ '\d{1,2}[/-]\d{1,2}'
    OR result ~ '\d{4}-\d{2}-\d{2}';

  -- Processor / wallet prefixes (order matters for multi-token prefixes)
  result := regexp_replace(result, '^PAYPAL(\s*\*|\s+)', '', 'i');
  result := regexp_replace(result, '^SQ(\s*\*|\s+)', '', 'i');
  result := regexp_replace(result, '^TST(\s*\*|\s+|\*)', '', 'i');
  result := regexp_replace(result, '^SP(\s+|$)', '', 'i');
  result := regexp_replace(result, '^(PP|GOOGLE|APPLE|AMZ|AMZN|CHK|CHECKCARD|POS|ACH|VISA|MC|DEB)\s+', '', 'i');

  -- Dates: ISO first, then MM/DD (avoid eating YYYY-MM-DD), then 6-digit tokens
  result := regexp_replace(result, '\y\d{4}-\d{2}-\d{2}\y', ' ', 'g');
  result := regexp_replace(result, '(?<!\d)\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?(?!\d)', ' ', 'g');
  result := regexp_replace(result, '\y\d{6}\y', ' ', 'g');

  -- Long numeric IDs / store / terminal numbers (5+ digits)
  result := regexp_replace(result, '\y#?\d{5,}\y', ' ', 'g');
  result := regexp_replace(result, '\y\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\y', ' ', 'g');

  -- Noise words
  result := regexp_replace(
    result,
    '\y(PURCHASE|POS|DEBIT|CREDIT|PAYMENT|PMT|TXN|TRANSACTION|ONLINE|WEB|MOBILE|APP|ACH|CHECKCARD|RECURRING|AUTOPAY|WITHDRAWAL|DEPOSIT|TRANSFER)\y',
    ' ',
    'gi'
  );

  IF strip_location THEN
    -- Trailing city + state (e.g. GREENVILLE SC)
    result := regexp_replace(
      result,
      '\s+[A-Z][A-Z\s]{0,24}\s+(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s*$',
      '',
      'i'
    );
    -- Trailing bare state code
    result := regexp_replace(
      result,
      '\s+(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s*$',
      '',
      'i'
    );
  END IF;

  -- Corporate suffixes (omit bare CO — often "Coffee" / brand fragment)
  result := regexp_replace(result, '\y(INC|LLC|LTD|CORP)\y\.?', ' ', 'gi');

  -- Non-alphanumeric → space, collapse whitespace, lower
  result := regexp_replace(result, '[^A-Z0-9\s]', ' ', 'g');
  result := lower(trim(regexp_replace(result, '\s+', ' ', 'g')));

  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Upsert: on new pattern, inherit global_merchant_id from any existing mapped pattern
-- with the same normalized form so future imports auto-match variants.
CREATE OR REPLACE FUNCTION upsert_global_merchant_pattern(description_text TEXT)
RETURNS void AS $$
DECLARE
  normalized_desc TEXT;
  existing_pattern_id BIGINT;
  inherited_merchant_id BIGINT;
BEGIN
  IF description_text IS NULL OR trim(description_text) = '' THEN
    RETURN;
  END IF;

  normalized_desc := normalize_merchant_pattern(description_text);

  SELECT id INTO existing_pattern_id
  FROM global_merchant_patterns
  WHERE pattern = description_text
  LIMIT 1;

  IF existing_pattern_id IS NOT NULL THEN
    UPDATE global_merchant_patterns
    SET
      usage_count = usage_count + 1,
      last_seen_at = NOW(),
      updated_at = NOW(),
      -- Keep normalized form in sync if normalizer improves
      normalized_pattern = normalized_desc
    WHERE id = existing_pattern_id;
  ELSE
    SELECT global_merchant_id INTO inherited_merchant_id
    FROM global_merchant_patterns
    WHERE normalized_pattern = normalized_desc
      AND global_merchant_id IS NOT NULL
    ORDER BY usage_count DESC
    LIMIT 1;

    INSERT INTO global_merchant_patterns (
      pattern,
      normalized_pattern,
      usage_count,
      first_seen_at,
      last_seen_at,
      global_merchant_id
    )
    VALUES (
      description_text,
      normalized_desc,
      1,
      NOW(),
      NOW(),
      inherited_merchant_id
    )
    ON CONFLICT (pattern) DO UPDATE
    SET
      usage_count = global_merchant_patterns.usage_count + 1,
      last_seen_at = NOW(),
      updated_at = NOW(),
      normalized_pattern = EXCLUDED.normalized_pattern,
      global_merchant_id = COALESCE(
        global_merchant_patterns.global_merchant_id,
        EXCLUDED.global_merchant_id
      );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill normalized_pattern with the improved normalizer
UPDATE global_merchant_patterns
SET
  normalized_pattern = normalize_merchant_pattern(pattern),
  updated_at = NOW()
WHERE pattern IS NOT NULL AND trim(pattern) != '';

-- For ungrouped patterns that now share a normalized form with a grouped pattern,
-- inherit the global_merchant_id (best-effort auto-map).
UPDATE global_merchant_patterns AS ungrouped
SET global_merchant_id = mapped.global_merchant_id
FROM (
  SELECT DISTINCT ON (normalized_pattern)
    normalized_pattern,
    global_merchant_id
  FROM global_merchant_patterns
  WHERE global_merchant_id IS NOT NULL
    AND normalized_pattern IS NOT NULL
    AND trim(normalized_pattern) != ''
  ORDER BY normalized_pattern, usage_count DESC
) AS mapped
WHERE ungrouped.global_merchant_id IS NULL
  AND ungrouped.normalized_pattern = mapped.normalized_pattern
  AND ungrouped.normalized_pattern IS NOT NULL
  AND trim(ungrouped.normalized_pattern) != '';

COMMIT;
