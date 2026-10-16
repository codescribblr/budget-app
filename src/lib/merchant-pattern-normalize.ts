/**
 * Shared global merchant pattern normalizer.
 * Used for global_merchant_patterns matching so dated / location / store-number
 * bank strings collapse to the same key (e.g. Aldi, Target, Bridge City Coffee).
 *
 * Keep in sync with SQL normalize_merchant_pattern() in
 * migrations/124_fix_cleanup_rpc_and_normalize_gaps.sql
 */

const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL',
  'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT',
  'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
]);

/** States that often appear inside brand names — only strip with purchase/date cues. */
const AMBIGUOUS_STATE_CODES = new Set([
  'CO', 'OR', 'IN', 'ME', 'OH', 'HI', 'OK', 'DE', 'WA', 'VA', 'MD', 'GA', 'AL', 'LA',
]);

const NOISE_WORDS = new Set([
  'PURCHASE', 'POS', 'DEBIT', 'CREDIT', 'PAYMENT', 'PMT', 'TXN', 'TRANSACTION',
  'ONLINE', 'WEB', 'MOBILE', 'APP', 'ACH', 'CHECKCARD', 'RECURRING', 'AUTOPAY',
  'WITHDRAWAL', 'DEPOSIT', 'TRANSFER', 'INC', 'LLC', 'LTD', 'CORP',
  'PPD', 'CCD', 'TEL',
]);
// Note: bare "CO" is not a noise word — it often means Coffee / company in merchant names.

/** Trailing Greenville-area street / road fragments (location noise, not brands). */
const TRAILING_STREET_FRAGMENTS = new Set([
  'WADE', 'WOODRUFF', 'HAYWOOD', 'POINSETT', 'PELHAM',
]);

const STREET_SUFFIXES = new Set(['RD', 'ROAD', 'ST', 'AVE', 'BLVD', 'DR', 'LN', 'WAY', 'CT']);

/** Multi-word / truncated trailing cities (matched against the last 2–3 tokens). */
const MULTI_WORD_TRAILING_CITIES: RegExp[] = [
  /^TRAVELERS RES(?:T)?$/,
  /^HILTON HEAD(?: I(?:SLAND)?)?$/,
  /^MOUNT PLEASAN(?:T)?$/,
  /^MT PLEASAN(?:T)?$/,
];

/**
 * Trailing business-type words that must not be eaten as "city" tokens.
 * Prevents "SOME CAFE SC" → "some" and "BURGER KING … SC" from losing KING.
 */
const PROTECTED_BRAND_TAILS = new Set([
  'CAFE', 'COFFEE', 'GRILLE', 'GRILL', 'RESTAURANT', 'KITCHEN', 'MARKET', 'MART',
  'STORE', 'SHOP', 'BAR', 'PUB', 'PIZZA', 'BURGER', 'KING', 'FOODS', 'DEPOT',
  'BUY', 'CLUB', 'EXPRESS', 'HOUSE', 'PLACE', 'JOINT', 'BAKERY', 'SALON',
  'STUDIO', 'GYM', 'FITNESS', 'HOTEL', 'INN', 'SUITES', 'PHARMACY', 'SUPERMARKET',
  'WHOLESALE', 'OUTLET', 'THEATER', 'THEATRE', 'CINEMA', 'DINER', 'BISTRO',
  'BREWERY', 'TAPROOM', 'ROASTERS', 'ROASTER',
]);

/**
 * Processor / wallet / aggregator prefixes (applied in order, repeatedly-safe).
 * Keep intentional trailing spaces where the raw descriptor uses "XX ".
 */
const PROCESSOR_PREFIXES: RegExp[] = [
  /^PAYPAL(\s*\*|\s+)/i,
  /^SQ(\s*\*|\s+)/i,
  /^TST(\s*\*|\s+|\*)/i,
  /^SP(\s+|$)/i,
  /^SUMUP(\s*\*|\s+)/i,
  /^NAYAX(\s*\*+|\s+)/i,
  /^VAGARO[_*\s]+/i,
  /^TCKTWEB(\s*\*|\s+)/i,
  /^(DD|PY|PB|LS|IN|AT|AFP|GB|LOY|DOC|COT|PAR|WWP|JFI|BLT|SPO|CTLP|CPI|IC|CM)\s*\*+\s*/i,
  /^(DD|PY|PB|LS|IN|AT|AFP|GB|LOY|DOC|COT|PAR|WWP|JFI|BLT|SPO|CTLP|CPI|IC)\s+/i,
  /^CM\./i,
  /^(GOOGLE|APPLE)\s*\*+\s*/i,
  /^(PP|GOOGLE|APPLE|AMZ|AMZN|CHK|CHECKCARD|POS|ACH|VISA|MC|DEB)\s+/i,
];

/**
 * Normalize a raw bank/merchant description for global pattern matching.
 */
export function normalizeGlobalMerchantPattern(description: string): string {
  if (!description) return '';

  const originalUpper = description.toUpperCase();
  const hasPurchaseCue =
    /\b(PURCHASE|POS|DEBIT|CHECKCARD)\b/.test(originalUpper) ||
    /\d{1,2}[/-]\d{1,2}/.test(originalUpper) ||
    /\d{4}-\d{2}-\d{2}/.test(originalUpper);

  let result = originalUpper.trim();

  // ACH: keep company name before DES:; drop DES:/ID:/INDN:/CO ID:/SEC codes
  if (/\bDES:/.test(result)) {
    const beforeDes = result.split(/\bDES:/)[0].trim();
    if (beforeDes) {
      result = beforeDes;
    }
  }

  for (const prefix of PROCESSOR_PREFIXES) {
    result = result.replace(prefix, '');
  }

  // Phones (dashes / spaces / dots) and common toll-free forms
  result = result.replace(/\b1?[-.\s]?(?:800|888|877|866|855|844|833)[-.\s]?\d{3}[-.\s]?\d{4}\b/g, ' ');
  result = result.replace(/\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g, ' ');

  // Card suffixes: DEBIT CARD *8115, CARD 4227, trailing *NNNN
  result = result.replace(/\bDEBIT\s+CARD\s*\*?\d+\b/g, ' ');
  result = result.replace(/\bCARD\s+\*?\d{4,}\b/g, ' ');
  result = result.replace(/\*\d{4}\b/g, ' ');

  // Order / confirmation / marketplace codes
  result = result.replace(/\bAMAZON(?:\.COM)?(?:\s*MKTPL?)?\*[^\s]*/g, 'AMAZON');
  result = result.replace(/\bAMAZON\.COM\b/g, 'AMAZON');
  result = result.replace(/\bCONF(?:IRMATION)?\s*#?\s*[A-Z0-9-]+\b/g, ' ');
  result = result.replace(/\bAIRBNB\s+[GM]-[A-Z0-9]+\b/g, 'AIRBNB');
  result = result.replace(/\bST-[A-Z0-9]+\b/g, ' ');

  // Dates: ISO first, then MM/DD, then 6-digit tokens
  result = result.replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ');
  result = result.replace(/(?<!\d)\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?(?!\d)/g, ' ');
  result = result.replace(/\b\d{6}\b/g, ' ');

  // Store / terminal codes: T-1182, F4798, Q07, #17020, SK1668, 110-T001, 0101 0011
  result = result.replace(/\b\d{2,4}-[A-Z]\d{2,}\b/g, ' ');
  result = result.replace(/\b[A-Z]{1,3}\d{3,}\b/g, ' ');
  result = result.replace(/\b[A-Z]-\d{2,}\b/g, ' ');
  result = result.replace(/\b[A-Z]\d{2,}\b/g, ' ');
  result = result.replace(/#\d+\b/g, ' ');
  result = result.replace(/\b#?\d{5,}\b/g, ' ');
  result = result.replace(/\b\d{4}\s+\d{4}\b/g, ' ');
  result = result.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, ' ');

  // Strip non-alphanumeric except spaces
  result = result.replace(/[^A-Z0-9\s]/g, ' ');
  result = result.replace(/\s+/g, ' ').trim();

  let tokens = result.split(' ').filter(Boolean);
  tokens = tokens.filter((t) => !NOISE_WORDS.has(t));

  // Unglue trailing city+state mashups: TRAVELERS RESSC → RES SC, HENDERSONVLLENC → … NC
  tokens = unglueTrailingCityState(tokens);

  // Drop at most one trailing location (+ state) when safe.
  // Only once — otherwise "BRIDGE CITY CO … GREENVILLE SC" would also eat CITY CO.
  if (tokens.length >= 2 && US_STATE_CODES.has(tokens[tokens.length - 1])) {
    const state = tokens[tokens.length - 1];
    const canStrip = hasPurchaseCue || !AMBIGUOUS_STATE_CODES.has(state);
    if (canStrip) {
      tokens.pop();
      const beforeStreet = tokens.length;
      tokens = stripTrailingStreetFragments(tokens);
      // Street fragment already encodes the location — don't also eat the brand word
      if (tokens.length === beforeStreet) {
        tokens = stripTrailingCityTokens(tokens);
      }
    }
  }

  return tokens.join(' ').toLowerCase().trim();
}

function stripTrailingCityTokens(tokens: string[]): string[] {
  const out = [...tokens];
  if (out.length < 2) return out;

  // Prefer known multi-word / truncated cities (2 or 3 tokens)
  for (const take of [3, 2]) {
    if (out.length < take + 0) continue;
    if (out.length <= take) continue; // keep at least one brand token
    const tail = out.slice(-take).join(' ');
    if (MULTI_WORD_TRAILING_CITIES.some((re) => re.test(tail))) {
      out.splice(-take, take);
      return out;
    }
  }

  // Default: single trailing alpha city word (never strip brand/business tails)
  const maybeCity = out[out.length - 1];
  if (
    /^[A-Z]+$/.test(maybeCity) &&
    maybeCity.length >= 2 &&
    out.length > 1 &&
    !PROTECTED_BRAND_TAILS.has(maybeCity)
  ) {
    out.pop();
  }
  return out;
}

function unglueTrailingCityState(tokens: string[]): string[] {
  if (tokens.length === 0) return tokens;
  const last = tokens[tokens.length - 1];
  if (last.length < 4) return tokens;

  // Try 2-letter state suffix first, then DC
  for (const stateLen of [2]) {
    const maybeState = last.slice(-stateLen);
    const cityPart = last.slice(0, -stateLen);
    if (
      US_STATE_CODES.has(maybeState) &&
      cityPart.length >= 3 &&
      /^[A-Z]+$/.test(cityPart) &&
      // Avoid splitting real words that merely end with letters that look like a state
      // when the "city" part is tiny; require reasonable length.
      cityPart.length >= 3
    ) {
      const next = tokens.slice(0, -1);
      next.push(cityPart, maybeState);
      return next;
    }
  }
  return tokens;
}

function stripTrailingStreetFragments(tokens: string[]): string[] {
  const out = [...tokens];
  // WOODRUFF RD / PELHAM AVE
  if (
    out.length >= 2 &&
    STREET_SUFFIXES.has(out[out.length - 1]) &&
    TRAILING_STREET_FRAGMENTS.has(out[out.length - 2])
  ) {
    out.pop();
    out.pop();
    return out;
  }
  if (out.length >= 1 && TRAILING_STREET_FRAGMENTS.has(out[out.length - 1])) {
    out.pop();
  }
  return out;
}

/**
 * Legacy/simple normalize used historically (lower + collapse whitespace).
 * Prefer normalizeGlobalMerchantPattern for new matching.
 */
export function normalizeMerchantPatternSimple(description: string): string {
  return description.toLowerCase().trim().replace(/\s+/g, ' ');
}
