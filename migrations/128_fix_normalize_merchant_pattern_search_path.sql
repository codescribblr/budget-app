-- Migration: 128_fix_normalize_merchant_pattern_search_path.sql
-- Description: Fix CSV import failure "function normalize_merchant_pattern(text)
--              does not exist" after migration 127.
-- Root cause: migration 088 set upsert_global_merchant_pattern as SECURITY DEFINER
--              with SET search_path = ''. Migration 122 rewrote that function's body
--              to call normalize_merchant_pattern() without a schema qualifier while
--              PostgreSQL retained the empty search_path — so the call cannot resolve
--              public.normalize_merchant_pattern. Migrations 123–127 only replaced the
--              normalizer body and did not fix the caller. CSV insert triggers
--              on_transaction_created_global_merchant → upsert → broken call.
-- Fix: recreate public.normalize_merchant_pattern with SET search_path = public,
--      and recreate upsert + trigger with schema-qualified calls under search_path = ''.
-- Fast: CREATE OR REPLACE only (no data DML).
-- Date: 2026-10-16
-- Keep normalize body in sync with src/lib/merchant-pattern-normalize.ts

BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_merchant_pattern(pattern_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.upsert_global_merchant_pattern(description_text TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_desc TEXT;
  existing_pattern_id BIGINT;
  inherited_merchant_id BIGINT;
BEGIN
  IF description_text IS NULL OR trim(description_text) = '' THEN
    RETURN;
  END IF;

  normalized_desc := public.normalize_merchant_pattern(description_text);

  SELECT id INTO existing_pattern_id
  FROM public.global_merchant_patterns
  WHERE pattern = description_text
  LIMIT 1;

  IF existing_pattern_id IS NOT NULL THEN
    UPDATE public.global_merchant_patterns
    SET
      usage_count = usage_count + 1,
      last_seen_at = NOW(),
      updated_at = NOW(),
      normalized_pattern = normalized_desc
    WHERE id = existing_pattern_id;
  ELSE
    SELECT global_merchant_id INTO inherited_merchant_id
    FROM public.global_merchant_patterns
    WHERE normalized_pattern = normalized_desc
      AND global_merchant_id IS NOT NULL
    ORDER BY usage_count DESC
    LIMIT 1;

    INSERT INTO public.global_merchant_patterns (
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
      usage_count = public.global_merchant_patterns.usage_count + 1,
      last_seen_at = NOW(),
      updated_at = NOW(),
      normalized_pattern = EXCLUDED.normalized_pattern,
      global_merchant_id = COALESCE(
        public.global_merchant_patterns.global_merchant_id,
        EXCLUDED.global_merchant_id
      );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_transaction_created_global_merchant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.description IS NOT NULL AND trim(NEW.description) != '' THEN
    PERFORM public.upsert_global_merchant_pattern(NEW.description);
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
