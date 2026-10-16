-- Migration: 123_improve_merchant_normalize_and_cleanup.sql
-- Description: Stronger merchant pattern normalization (store numbers, city/state, INC)
--              and one-time cleanup of empty unlinked per-user merchant groups.
-- Date: 2026-10-16

BEGIN;

-- =============================================================================
-- 1. Improved normalize_merchant_pattern (keep in sync with
--    src/lib/merchant-pattern-normalize.ts)
-- =============================================================================

CREATE OR REPLACE FUNCTION normalize_merchant_pattern(pattern_text TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
  has_purchase_cue BOOLEAN;
  tokens TEXT[];
  token TEXT;
  state_code TEXT;
  ambiguous_states TEXT[] := ARRAY[
    'CO','OR','IN','ME','OH','HI','OK','DE','WA','VA','MD','GA','AL','LA'
  ];
  noise_words TEXT[] := ARRAY[
    'PURCHASE','POS','DEBIT','CREDIT','PAYMENT','PMT','TXN','TRANSACTION',
    'ONLINE','WEB','MOBILE','APP','ACH','CHECKCARD','RECURRING','AUTOPAY',
    'WITHDRAWAL','DEPOSIT','TRANSFER','INC','LLC','LTD','CORP'
  ];
  kept TEXT[] := ARRAY[]::TEXT[];
  i INT;
BEGIN
  IF pattern_text IS NULL THEN
    RETURN '';
  END IF;

  result := upper(trim(pattern_text));

  has_purchase_cue :=
    result ~ '(PURCHASE|POS|DEBIT|CHECKCARD)'
    OR result ~ '\d{1,2}[/-]\d{1,2}'
    OR result ~ '\d{4}-\d{2}-\d{2}';

  -- Processor / wallet prefixes
  result := regexp_replace(result, '^PAYPAL(\s*\*|\s+)', '', 'i');
  result := regexp_replace(result, '^SQ(\s*\*|\s+)', '', 'i');
  result := regexp_replace(result, '^TST(\s*\*|\s+|\*)', '', 'i');
  result := regexp_replace(result, '^SP(\s+|$)', '', 'i');
  result := regexp_replace(result, '^(PP|GOOGLE|APPLE|AMZ|AMZN|CHK|CHECKCARD|POS|ACH|VISA|MC|DEB)\s+', '', 'i');

  -- Dates
  result := regexp_replace(result, '\y\d{4}-\d{2}-\d{2}\y', ' ', 'g');
  result := regexp_replace(result, '(?<!\d)\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?(?!\d)', ' ', 'g');
  result := regexp_replace(result, '\y\d{6}\y', ' ', 'g');

  -- Store / terminal codes: T-1182, F4798, Q07, #17020
  result := regexp_replace(result, '\y[A-Z]-\d{2,}\y', ' ', 'g');
  result := regexp_replace(result, '\y[A-Z]\d{2,}\y', ' ', 'g');
  result := regexp_replace(result, '#\d+\y', ' ', 'g');
  result := regexp_replace(result, '\y#?\d{5,}\y', ' ', 'g');
  result := regexp_replace(result, '\y\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\y', ' ', 'g');

  -- Non-alphanumeric → space
  result := regexp_replace(result, '[^A-Z0-9\s]', ' ', 'g');
  result := trim(regexp_replace(result, '\s+', ' ', 'g'));

  IF result = '' THEN
    RETURN '';
  END IF;

  tokens := string_to_array(result, ' ');

  -- Drop noise words
  FOR i IN 1 .. coalesce(array_length(tokens, 1), 0) LOOP
    token := tokens[i];
    IF token IS NULL OR token = '' THEN
      CONTINUE;
    END IF;
    IF NOT (token = ANY (noise_words)) THEN
      kept := array_append(kept, token);
    END IF;
  END LOOP;
  tokens := kept;

  -- Drop at most one trailing city + state pair when safe
  IF coalesce(array_length(tokens, 1), 0) >= 2 THEN
    state_code := tokens[array_length(tokens, 1)];
    IF state_code ~ '^(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)$'
       AND (has_purchase_cue OR NOT (state_code = ANY (ambiguous_states))) THEN
      tokens := tokens[1:array_length(tokens, 1) - 1];
      IF coalesce(array_length(tokens, 1), 0) >= 1 AND tokens[array_length(tokens, 1)] ~ '^[A-Z]{2,}$' THEN
        tokens := tokens[1:array_length(tokens, 1) - 1];
      END IF;
    END IF;
  END IF;

  RETURN lower(array_to_string(tokens, ' '));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill normalized_pattern with the improved normalizer
UPDATE global_merchant_patterns
SET
  normalized_pattern = normalize_merchant_pattern(pattern),
  updated_at = NOW()
WHERE pattern IS NOT NULL AND trim(pattern) != '';

-- Inherit global_merchant_id for ungrouped patterns that now share a normalized form
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

-- =============================================================================
-- 2. One-time cleanup of empty unlinked per-user merchant groups
--    Safe: only groups with global_merchant_id IS NULL and no references.
-- =============================================================================

DELETE FROM merchant_groups mg
WHERE mg.global_merchant_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM transactions t WHERE t.merchant_group_id = mg.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM merchant_mappings mm WHERE mm.merchant_group_id = mg.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM merchant_category_rules mcr WHERE mcr.merchant_group_id = mg.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM recurring_transactions rt WHERE rt.merchant_group_id = mg.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM recurring_user_feedback ruf WHERE ruf.merchant_group_id = mg.id
  );

COMMIT;
