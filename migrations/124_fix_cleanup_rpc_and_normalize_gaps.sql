-- Migration: 124_fix_cleanup_rpc_and_normalize_gaps.sql
-- Description: Set-based empty merchant-group cleanup RPC + weekly job;
--              expand normalize_merchant_pattern (phones, cards, ACH, processors,
--              multi-word cities) and recompute normalized columns.
-- Date: 2026-10-16
-- Keep in sync with src/lib/merchant-pattern-normalize.ts

BEGIN;

-- =============================================================================
-- 1. Expanded normalize_merchant_pattern
-- =============================================================================

CREATE OR REPLACE FUNCTION normalize_merchant_pattern(pattern_text TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
  has_purchase_cue BOOLEAN;
  tokens TEXT[];
  token TEXT;
  state_code TEXT;
  city_part TEXT;
  last_tok TEXT;
  before_street INT;
  tail2 TEXT;
  tail3 TEXT;
  stripped_street BOOLEAN;
  ambiguous_states TEXT[] := ARRAY[
    'CO','OR','IN','ME','OH','HI','OK','DE','WA','VA','MD','GA','AL','LA'
  ];
  noise_words TEXT[] := ARRAY[
    'PURCHASE','POS','DEBIT','CREDIT','PAYMENT','PMT','TXN','TRANSACTION',
    'ONLINE','WEB','MOBILE','APP','ACH','CHECKCARD','RECURRING','AUTOPAY',
    'WITHDRAWAL','DEPOSIT','TRANSFER','INC','LLC','LTD','CORP','PPD','CCD','TEL'
  ];
  street_fragments TEXT[] := ARRAY[
    'WADE','WOODRUFF','HAYWOOD','POINSETT','PELHAM'
  ];
  street_suffixes TEXT[] := ARRAY[
    'RD','ROAD','ST','AVE','BLVD','DR','LN','WAY','CT'
  ];
  protected_tails TEXT[] := ARRAY[
    'CAFE','COFFEE','GRILLE','GRILL','RESTAURANT','KITCHEN','MARKET','MART',
    'STORE','SHOP','BAR','PUB','PIZZA','BURGER','KING','FOODS','DEPOT',
    'BUY','CLUB','EXPRESS','HOUSE','PLACE','JOINT','BAKERY','SALON',
    'STUDIO','GYM','FITNESS','HOTEL','INN','SUITES','PHARMACY','SUPERMARKET',
    'WHOLESALE','OUTLET','THEATER','THEATRE','CINEMA','DINER','BISTRO',
    'BREWERY','TAPROOM','ROASTERS','ROASTER'
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

  -- ACH: keep company before DES:
  IF result ~ '\yDES:' THEN
    result := trim(split_part(result, 'DES:', 1));
  END IF;

  -- Processor / wallet prefixes
  result := regexp_replace(result, '^PAYPAL(\s*\*|\s+)', '', 'i');
  result := regexp_replace(result, '^SQ(\s*\*|\s+)', '', 'i');
  result := regexp_replace(result, '^TST(\s*\*|\s+|\*)', '', 'i');
  result := regexp_replace(result, '^SP(\s+|$)', '', 'i');
  result := regexp_replace(result, '^SUMUP(\s*\*|\s+)', '', 'i');
  result := regexp_replace(result, '^NAYAX(\s*\*+|\s+)', '', 'i');
  result := regexp_replace(result, '^VAGARO[_*\s]+', '', 'i');
  result := regexp_replace(result, '^TCKTWEB(\s*\*|\s+)', '', 'i');
  result := regexp_replace(result, '^(DD|PY|PB|LS|IN|AT|AFP|GB|LOY|DOC|COT|PAR|WWP|JFI|BLT|SPO|CTLP|CPI|IC|CM)\s*\*+\s*', '', 'i');
  result := regexp_replace(result, '^(DD|PY|PB|LS|IN|AT|AFP|GB|LOY|DOC|COT|PAR|WWP|JFI|BLT|SPO|CTLP|CPI|IC)\s+', '', 'i');
  result := regexp_replace(result, '^CM\.', '', 'i');
  result := regexp_replace(result, '^(GOOGLE|APPLE)\s*\*+\s*', '', 'i');
  result := regexp_replace(result, '^(PP|GOOGLE|APPLE|AMZ|AMZN|CHK|CHECKCARD|POS|ACH|VISA|MC|DEB)\s+', '', 'i');

  -- Phones + toll-free
  result := regexp_replace(result, '\y1?[-.\s]?(800|888|877|866|855|844|833)[-.\s]?\d{3}[-.\s]?\d{4}\y', ' ', 'g');
  result := regexp_replace(result, '\y\d{3}[-.\s]\d{3}[-.\s]\d{4}\y', ' ', 'g');

  -- Card suffixes
  result := regexp_replace(result, '\yDEBIT\s+CARD\s*\*?\d+\y', ' ', 'g');
  result := regexp_replace(result, '\yCARD\s+\*?\d{4,}\y', ' ', 'g');
  result := regexp_replace(result, '\*\d{4}\y', ' ', 'g');

  -- Order / confirmation / marketplace codes
  result := regexp_replace(result, '\yAMAZON(\.COM)?(\s*MKTPL?)?\*[^\s]*', 'AMAZON', 'g');
  result := regexp_replace(result, '\yAMAZON\.COM\y', 'AMAZON', 'g');
  result := regexp_replace(result, '\yCONF(IRMATION)?\s*#?\s*[A-Z0-9-]+\y', ' ', 'g');
  result := regexp_replace(result, '\yAIRBNB\s+[GM]-[A-Z0-9]+\y', 'AIRBNB', 'g');
  result := regexp_replace(result, '\yST-[A-Z0-9]+\y', ' ', 'g');

  -- Dates
  result := regexp_replace(result, '\y\d{4}-\d{2}-\d{2}\y', ' ', 'g');
  result := regexp_replace(result, '(?<!\d)\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?(?!\d)', ' ', 'g');
  result := regexp_replace(result, '\y\d{6}\y', ' ', 'g');

  -- Store / terminal codes
  result := regexp_replace(result, '\y\d{2,4}-[A-Z]\d{2,}\y', ' ', 'g');
  result := regexp_replace(result, '\y[A-Z]{1,3}\d{3,}\y', ' ', 'g');
  result := regexp_replace(result, '\y[A-Z]-\d{2,}\y', ' ', 'g');
  result := regexp_replace(result, '\y[A-Z]\d{2,}\y', ' ', 'g');
  result := regexp_replace(result, '#\d+\y', ' ', 'g');
  result := regexp_replace(result, '\y#?\d{5,}\y', ' ', 'g');
  result := regexp_replace(result, '\y\d{4}\s+\d{4}\y', ' ', 'g');
  result := regexp_replace(result, '\y\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\y', ' ', 'g');

  -- Non-alphanumeric → space
  result := regexp_replace(result, '[^A-Z0-9\s]', ' ', 'g');
  result := trim(regexp_replace(result, '\s+', ' ', 'g'));

  IF result = '' THEN
    RETURN '';
  END IF;

  tokens := string_to_array(result, ' ');

  -- Drop noise words
  kept := ARRAY[]::TEXT[];
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

  -- Unglue trailing city+state mashups (TRAVELERS RESSC, HENDERSONVLLENC)
  IF coalesce(array_length(tokens, 1), 0) >= 1 THEN
    last_tok := tokens[array_length(tokens, 1)];
    IF length(last_tok) >= 5 THEN
      state_code := right(last_tok, 2);
      city_part := left(last_tok, length(last_tok) - 2);
      IF state_code ~ '^(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)$'
         AND length(city_part) >= 3
         AND city_part ~ '^[A-Z]+$' THEN
        tokens := tokens[1:array_length(tokens, 1) - 1] || ARRAY[city_part, state_code];
      END IF;
    END IF;
  END IF;

  -- Strip trailing state + street fragment OR city (once)
  IF coalesce(array_length(tokens, 1), 0) >= 2 THEN
    state_code := tokens[array_length(tokens, 1)];
    IF state_code ~ '^(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)$'
       AND (has_purchase_cue OR NOT (state_code = ANY (ambiguous_states))) THEN
      tokens := tokens[1:array_length(tokens, 1) - 1];
      before_street := coalesce(array_length(tokens, 1), 0);
      stripped_street := FALSE;

      -- WOODRUFF RD style
      IF coalesce(array_length(tokens, 1), 0) >= 2
         AND tokens[array_length(tokens, 1)] = ANY (street_suffixes)
         AND tokens[array_length(tokens, 1) - 1] = ANY (street_fragments) THEN
        tokens := tokens[1:array_length(tokens, 1) - 2];
        stripped_street := TRUE;
      ELSIF coalesce(array_length(tokens, 1), 0) >= 1
            AND tokens[array_length(tokens, 1)] = ANY (street_fragments) THEN
        tokens := tokens[1:array_length(tokens, 1) - 1];
        stripped_street := TRUE;
      END IF;

      IF NOT stripped_street AND coalesce(array_length(tokens, 1), 0) >= 2 THEN
        -- Multi-word / truncated cities
        IF coalesce(array_length(tokens, 1), 0) >= 3 THEN
          tail3 := tokens[array_length(tokens, 1) - 2] || ' ' || tokens[array_length(tokens, 1) - 1] || ' ' || tokens[array_length(tokens, 1)];
          IF tail3 ~ '^(TRAVELERS RES(T)?|HILTON HEAD( I(SLAND)?)?|MOUNT PLEASAN(T)?|MT PLEASAN(T)?)$'
             AND array_length(tokens, 1) > 3 THEN
            tokens := tokens[1:array_length(tokens, 1) - 3];
          ELSIF coalesce(array_length(tokens, 1), 0) >= 2 THEN
            tail2 := tokens[array_length(tokens, 1) - 1] || ' ' || tokens[array_length(tokens, 1)];
            IF tail2 ~ '^(TRAVELERS RES(T)?|HILTON HEAD|MOUNT PLEASAN(T)?|MT PLEASAN(T)?)$'
               AND array_length(tokens, 1) > 2 THEN
              tokens := tokens[1:array_length(tokens, 1) - 2];
            ELSIF tokens[array_length(tokens, 1)] ~ '^[A-Z]{2,}$'
                  AND NOT (tokens[array_length(tokens, 1)] = ANY (protected_tails)) THEN
              tokens := tokens[1:array_length(tokens, 1) - 1];
            END IF;
          END IF;
        ELSIF coalesce(array_length(tokens, 1), 0) >= 2 THEN
          tail2 := tokens[array_length(tokens, 1) - 1] || ' ' || tokens[array_length(tokens, 1)];
          IF tail2 ~ '^(TRAVELERS RES(T)?|HILTON HEAD|MOUNT PLEASAN(T)?|MT PLEASAN(T)?)$'
             AND array_length(tokens, 1) > 2 THEN
            tokens := tokens[1:array_length(tokens, 1) - 2];
          ELSIF tokens[array_length(tokens, 1)] ~ '^[A-Z]{2,}$'
                AND NOT (tokens[array_length(tokens, 1)] = ANY (protected_tails)) THEN
            tokens := tokens[1:array_length(tokens, 1) - 1];
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN lower(array_to_string(tokens, ' '));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- 2. Set-based cleanup RPC (optional user scope)
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_empty_merchant_groups(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH doomed AS (
    SELECT mg.id
    FROM merchant_groups mg
    WHERE mg.global_merchant_id IS NULL
      AND (p_user_id IS NULL OR mg.user_id = p_user_id)
      AND NOT EXISTS (
        SELECT 1 FROM transactions t WHERE t.merchant_group_id = mg.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.merchant_override_id IS NOT NULL
          AND t.merchant_group_id = mg.id
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
      )
  ),
  deleted AS (
    DELETE FROM merchant_groups mg
    WHERE mg.id IN (SELECT id FROM doomed)
    RETURNING mg.id
  )
  SELECT count(*)::INTEGER INTO deleted_count FROM deleted;

  RETURN coalesce(deleted_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION cleanup_empty_merchant_groups(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_empty_merchant_groups(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_empty_merchant_groups(UUID) TO postgres;

COMMENT ON FUNCTION cleanup_empty_merchant_groups(UUID) IS
  'Set-based delete of empty unlinked per-user merchant groups. Optional p_user_id scopes to one user.';

-- =============================================================================
-- 3. Recompute normalized columns (set-based) + inherit mappings
-- =============================================================================

UPDATE global_merchant_patterns
SET
  normalized_pattern = normalize_merchant_pattern(pattern),
  updated_at = NOW()
WHERE pattern IS NOT NULL AND trim(pattern) != '';

UPDATE merchant_mappings
SET
  normalized_pattern = upper(normalize_merchant_pattern(pattern)),
  updated_at = NOW()
WHERE pattern IS NOT NULL AND trim(pattern) != '';

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
  ORDER BY normalized_pattern, usage_count DESC, id
) AS mapped
WHERE ungrouped.global_merchant_id IS NULL
  AND ungrouped.normalized_pattern = mapped.normalized_pattern
  AND ungrouped.normalized_pattern IS NOT NULL
  AND trim(ungrouped.normalized_pattern) != '';

-- =============================================================================
-- 4. Weekly scheduled job for empty-group cleanup
-- =============================================================================

INSERT INTO scheduled_jobs (job_type, status, scheduled_for, metadata)
SELECT
  'cleanup_empty_merchant_groups',
  'pending',
  (
    (CURRENT_DATE AT TIME ZONE 'UTC')
    + (CASE WHEN (8 - EXTRACT(ISODOW FROM CURRENT_DATE)::int) % 7 = 0 THEN 7 ELSE (8 - EXTRACT(ISODOW FROM CURRENT_DATE)::int) % 7 END) * INTERVAL '1 day'
    + INTERVAL '8 hours'
  )::timestamptz,
  '{"schedule": "0 8 * * 1"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM scheduled_jobs WHERE job_type = 'cleanup_empty_merchant_groups'
);

COMMIT;
