-- Migration: 127_pattern_sync_and_brand_tld_normalize.sql
-- Description: Strip .com/.net and apostrophes in normalize_merchant_pattern;
--              recompute; inherit mappings; one-time relink of transactions whose
--              description maps to a global pattern but whose group is not linked.
-- Date: 2026-10-16
-- Keep in sync with src/lib/merchant-pattern-normalize.ts

BEGIN;

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
  tail2 TEXT;
  tail3 TEXT;
  stripped_street BOOLEAN;
  ambiguous_states TEXT[] := ARRAY[
    'CO','OR','IN','ME','OH','HI','OK','DE','WA','VA','MD','GA','AL','LA'
  ];
  noise_words TEXT[] := ARRAY[
    'PURCHASE','POS','DEBIT','CREDIT','PAYMENT','PMT','TXN','TRANSACTION',
    'ONLINE','WEB','MOBILE','APP','ACH','CHECKCARD','RECURRING','AUTOPAY',
    'WITHDRAWAL','DEPOSIT','TRANSFER','INC','LLC','LTD','CORP','PPD','CCD','TEL','SIGONFILE','ONFILE','AUTHORIZED','AUTHORIZATION','COM','NET','ORG'
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
    'BREWERY','TAPROOM','ROASTERS','ROASTER','JOHNS'
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

  IF result ~ '\yDES:' THEN
    result := trim(split_part(result, 'DES:', 1));
  END IF;

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

  -- SIGONFILE / ON FILE
  result := regexp_replace(result, '\ySIG\s*ON\s*FILE\y', ' ', 'g');
  result := regexp_replace(result, '\ySIGONFILE\y', ' ', 'g');
  result := regexp_replace(result, '\yON\s*FILE\y', ' ', 'g');

  -- AUTHORIZED ON tails
  result := regexp_replace(result, '\yAUTHORIZED\s+ON\y.*$', ' ', 'g');
  result := regexp_replace(result, '\yAUTH(ORIZATION)?\s+ON\y.*$', ' ', 'g');

  -- Reference codes
  result := regexp_replace(result, '\yREF(ERENCE)?\s*#?\s*[A-Z0-9-]+\y', ' ', 'g');
  result := regexp_replace(result, '\yCONF(IRMATION)?\s*#?\s*[A-Z0-9-]+\y', ' ', 'g');

  -- ACH/transfer account-holder tails
  IF result ~ '\y(ACH|TRANSFER|XFER|WIRE|PAYMENT|PPD|CCD|WEB)\y' THEN
    result := regexp_replace(result, '\y(TO|FROM|INDN)\s+[A-Z][A-Z .''-]{1,60}$', ' ', 'g');
    result := regexp_replace(result, '\yINDN:[^\s]+(\s+[A-Z][A-Z .''-]+)?', ' ', 'g');
  END IF;


  result := regexp_replace(result, '\y1?[-.\s]?(800|888|877|866|855|844|833)[-.\s]?\d{3}[-.\s]?\d{4}\y', ' ', 'g');
  result := regexp_replace(result, '\y\d{3}[-.\s]\d{3}[-.\s]\d{4}\y', ' ', 'g');

  result := regexp_replace(result, '\yDEBIT\s+CARD\s*\*?\d+\y', ' ', 'g');
  result := regexp_replace(result, '\yCARD\s+\*?\d{4,}\y', ' ', 'g');
  result := regexp_replace(result, '\*\d{4}\y', ' ', 'g');

  result := regexp_replace(result, '\yAMAZON(\.COM)?(\s*MKTPL?)?\*[^\s]*', 'AMAZON', 'g');
  result := regexp_replace(result, '\yAMAZON\.COM\y', 'AMAZON', 'g');
  result := regexp_replace(result, '\yCONF(IRMATION)?\s*#?\s*[A-Z0-9-]+\y', ' ', 'g');
  result := regexp_replace(result, '\yAIRBNB\s+[GM]-[A-Z0-9]+\y', 'AIRBNB', 'g');
  result := regexp_replace(result, '\yST-[A-Z0-9]+\y', ' ', 'g');

  -- Brand TLD suffixes: WALMART.COM → WALMART
  result := regexp_replace(result, '\.(COM|NET|ORG|IO|CO|US)\y', ' ', 'g');

  -- Apostrophes: PAPA JOHN'S → PAPA JOHNS
  result := regexp_replace(result, '[''`´]', '', 'g');


  result := regexp_replace(result, '\y\d{4}-\d{2}-\d{2}\y', ' ', 'g');
  result := regexp_replace(result, '(?<!\d)\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?(?!\d)', ' ', 'g');
  result := regexp_replace(result, '\y\d{6}\y', ' ', 'g');

  result := regexp_replace(result, '\y\d{2,4}-[A-Z]\d{2,}\y', ' ', 'g');
  result := regexp_replace(result, '\y[A-Z]{1,3}\d{3,}\y', ' ', 'g');
  result := regexp_replace(result, '\y[A-Z]-\d{2,}\y', ' ', 'g');
  result := regexp_replace(result, '\y[A-Z]\d{2,}\y', ' ', 'g');
  -- Letter + single digit register/terminal (R1, R2, T1)
  result := regexp_replace(result, '\y[A-Z]\d\y', ' ', 'g');
  result := regexp_replace(result, '#\d+\y', ' ', 'g');
  result := regexp_replace(result, '\y#?\d{4,}\y', ' ', 'g');
  result := regexp_replace(result, '\y\d{4}\s+\d{4}\y', ' ', 'g');
  result := regexp_replace(result, '\y\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\y', ' ', 'g');

  result := regexp_replace(result, '[^A-Z0-9\s]', ' ', 'g');
  result := trim(regexp_replace(result, '\s+', ' ', 'g'));

  IF result = '' THEN
    RETURN '';
  END IF;

  tokens := string_to_array(result, ' ');

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

  IF coalesce(array_length(tokens, 1), 0) >= 2 THEN
    state_code := tokens[array_length(tokens, 1)];
    IF state_code ~ '^(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)$'
       AND (has_purchase_cue OR NOT (state_code = ANY (ambiguous_states))) THEN
      tokens := tokens[1:array_length(tokens, 1) - 1];
      stripped_street := FALSE;

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

-- Recompute normalized columns
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
  ORDER BY normalized_pattern, usage_count DESC, id
) AS mapped
WHERE ungrouped.global_merchant_id IS NULL
  AND ungrouped.normalized_pattern = mapped.normalized_pattern
  AND ungrouped.normalized_pattern IS NOT NULL
  AND trim(ungrouped.normalized_pattern) != '';

-- =============================================================================
-- One-time: relink transactions whose description maps to a global pattern but
-- whose merchant_group is not linked to that global merchant.
-- =============================================================================

-- 1) Link existing same-name user groups to the global merchant when still unlinked
UPDATE merchant_groups mg
SET
  global_merchant_id = gm.id,
  updated_at = NOW()
FROM global_merchants gm
WHERE mg.global_merchant_id IS NULL
  AND lower(trim(mg.display_name)) = lower(trim(gm.display_name))
  AND gm.status = 'active';

-- 2) Ensure a canonical user group exists for every (user, account, global) that
--    has mismatched transactions (exact pattern match)
INSERT INTO merchant_groups (user_id, account_id, display_name, global_merchant_id)
SELECT DISTINCT ON (t.user_id, t.budget_account_id, gm.id)
  t.user_id,
  t.budget_account_id,
  gm.display_name,
  gm.id
FROM transactions t
JOIN global_merchant_patterns gmp
  ON gmp.pattern = t.description
 AND gmp.global_merchant_id IS NOT NULL
JOIN global_merchants gm
  ON gm.id = gmp.global_merchant_id
 AND gm.status = 'active'
WHERE t.merchant_override_id IS NULL
  AND t.user_id IS NOT NULL
  AND t.budget_account_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM merchant_groups mg
    WHERE mg.user_id = t.user_id
      AND mg.account_id = t.budget_account_id
      AND mg.global_merchant_id = gm.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM merchant_groups mg
    WHERE mg.user_id = t.user_id
      AND mg.account_id = t.budget_account_id
      AND mg.display_name = gm.display_name
  )
ORDER BY t.user_id, t.budget_account_id, gm.id
ON CONFLICT (user_id, display_name) DO UPDATE
SET
  global_merchant_id = COALESCE(merchant_groups.global_merchant_id, EXCLUDED.global_merchant_id),
  updated_at = NOW();

-- 3) Same for normalized_pattern matches (descriptions that normalize to a mapped form)
INSERT INTO merchant_groups (user_id, account_id, display_name, global_merchant_id)
SELECT DISTINCT ON (t.user_id, t.budget_account_id, mapped.global_merchant_id)
  t.user_id,
  t.budget_account_id,
  gm.display_name,
  mapped.global_merchant_id
FROM transactions t
JOIN LATERAL (
  SELECT gmp.global_merchant_id
  FROM global_merchant_patterns gmp
  WHERE gmp.global_merchant_id IS NOT NULL
    AND gmp.normalized_pattern IS NOT NULL
    AND trim(gmp.normalized_pattern) != ''
    AND gmp.normalized_pattern = normalize_merchant_pattern(t.description)
  ORDER BY gmp.usage_count DESC NULLS LAST, gmp.id
  LIMIT 1
) mapped ON TRUE
JOIN global_merchants gm
  ON gm.id = mapped.global_merchant_id
 AND gm.status = 'active'
WHERE t.merchant_override_id IS NULL
  AND t.user_id IS NOT NULL
  AND t.budget_account_id IS NOT NULL
  AND t.description IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM merchant_groups mg
    WHERE mg.user_id = t.user_id
      AND mg.account_id = t.budget_account_id
      AND mg.global_merchant_id = mapped.global_merchant_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM merchant_groups mg
    WHERE mg.user_id = t.user_id
      AND mg.account_id = t.budget_account_id
      AND mg.display_name = gm.display_name
  )
ORDER BY t.user_id, t.budget_account_id, mapped.global_merchant_id
ON CONFLICT (user_id, display_name) DO UPDATE
SET
  global_merchant_id = COALESCE(merchant_groups.global_merchant_id, EXCLUDED.global_merchant_id),
  updated_at = NOW();

-- 4) Relink transactions (exact pattern) onto the canonical global-linked group
UPDATE transactions t
SET merchant_group_id = mg.id
FROM global_merchant_patterns gmp,
     global_merchants gm,
     merchant_groups mg
WHERE gmp.pattern = t.description
  AND gmp.global_merchant_id IS NOT NULL
  AND gm.id = gmp.global_merchant_id
  AND gm.status = 'active'
  AND mg.user_id = t.user_id
  AND mg.account_id = t.budget_account_id
  AND mg.global_merchant_id = gm.id
  AND t.merchant_override_id IS NULL
  AND t.user_id IS NOT NULL
  AND t.budget_account_id IS NOT NULL
  AND (
    t.merchant_group_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM merchant_groups cur
      WHERE cur.id = t.merchant_group_id
        AND cur.global_merchant_id = gm.id
    )
  );

-- 5) Relink by normalized form
UPDATE transactions t
SET merchant_group_id = mg.id
FROM LATERAL (
  SELECT gmp.global_merchant_id
  FROM global_merchant_patterns gmp
  WHERE gmp.global_merchant_id IS NOT NULL
    AND gmp.normalized_pattern IS NOT NULL
    AND trim(gmp.normalized_pattern) != ''
    AND gmp.normalized_pattern = normalize_merchant_pattern(t.description)
  ORDER BY gmp.usage_count DESC NULLS LAST, gmp.id
  LIMIT 1
) mapped,
     global_merchants gm,
     merchant_groups mg
WHERE gm.id = mapped.global_merchant_id
  AND gm.status = 'active'
  AND mg.user_id = t.user_id
  AND mg.account_id = t.budget_account_id
  AND mg.global_merchant_id = gm.id
  AND t.merchant_override_id IS NULL
  AND t.user_id IS NOT NULL
  AND t.budget_account_id IS NOT NULL
  AND t.description IS NOT NULL
  AND (
    t.merchant_group_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM merchant_groups cur
      WHERE cur.id = t.merchant_group_id
        AND cur.global_merchant_id = gm.id
    )
  );

COMMIT;
