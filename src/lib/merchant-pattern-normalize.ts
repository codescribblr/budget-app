/**
 * Shared global merchant pattern normalizer.
 * Used for global_merchant_patterns matching so dated / location / store-number
 * bank strings collapse to the same key (e.g. Aldi, Target, Bridge City Coffee).
 *
 * Keep in sync with SQL normalize_merchant_pattern() in
 * migrations/122_add_admin_api_keys_and_merchant_agent.sql and
 * migrations/123_improve_merchant_normalize_and_cleanup.sql
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
]);
// Note: bare "CO" is not a noise word — it often means Coffee / company in merchant names.

const PROCESSOR_PREFIXES: RegExp[] = [
  /^PAYPAL(\s*\*|\s+)/i,
  /^SQ(\s*\*|\s+)/i,
  /^TST(\s*\*|\s+|\*)/i,
  /^SP(\s+|$)/i,
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

  for (const prefix of PROCESSOR_PREFIXES) {
    result = result.replace(prefix, '');
  }

  // Dates: ISO first (so MM/DD does not partially eat YYYY-MM-DD), then MM/DD, then 6-digit tokens
  result = result.replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ');
  result = result.replace(/(?<!\d)\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?(?!\d)/g, ' ');
  result = result.replace(/\b\d{6}\b/g, ' ');

  // Store / terminal codes: T-1182, F4798, Q07, #17020, plain long digit runs
  result = result.replace(/\b[A-Z]-\d{2,}\b/g, ' ');
  result = result.replace(/\b[A-Z]\d{2,}\b/g, ' ');
  result = result.replace(/#\d+\b/g, ' ');
  result = result.replace(/\b#?\d{5,}\b/g, ' ');
  result = result.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, ' ');

  // Strip non-alphanumeric except spaces (keep tokens for word filtering)
  result = result.replace(/[^A-Z0-9\s]/g, ' ');
  result = result.replace(/\s+/g, ' ').trim();

  let tokens = result.split(' ').filter(Boolean);
  tokens = tokens.filter((t) => !NOISE_WORDS.has(t));

  // Drop at most one trailing city + state pair when safe.
  // (Only once — otherwise "BRIDGE CITY CO … GREENVILLE SC" would also eat CITY CO.)
  if (tokens.length >= 2 && US_STATE_CODES.has(tokens[tokens.length - 1])) {
    const state = tokens[tokens.length - 1];
    const canStrip = hasPurchaseCue || !AMBIGUOUS_STATE_CODES.has(state);
    if (canStrip) {
      tokens.pop();
      if (tokens.length > 0) {
        const maybeCity = tokens[tokens.length - 1];
        if (/^[A-Z]+$/.test(maybeCity) && maybeCity.length >= 2) {
          tokens.pop();
        }
      }
    }
  }

  return tokens.join(' ').toLowerCase().trim();
}

/**
 * Legacy/simple normalize used historically (lower + collapse whitespace).
 * Prefer normalizeGlobalMerchantPattern for new matching.
 */
export function normalizeMerchantPatternSimple(description: string): string {
  return description.toLowerCase().trim().replace(/\s+/g, ' ');
}
