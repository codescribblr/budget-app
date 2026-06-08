const BILL_KEYWORDS = [
  'AUTOPAY',
  'AUTO PAY',
  'AUTO-PAY',
  'RECURRING',
  'SUBSCRIPTION',
  'MEMBERSHIP',
  'MONTHLY PAYMENT',
  'EFT PAYMENT',
  'BILL PAY',
  'BILLPAY',
  'ACH DEBIT',
  'DIRECT DEBIT',
  'PREAUTHORIZED',
  'PRE-AUTHORIZED',
  'UTILITY',
  'ELECTRIC',
  'POWER',
  'WATER',
  'SEWER',
  'INSURANCE',
  'MORTGAGE',
  'LOAN PAYMENT',
];

const PAYROLL_KEYWORDS = [
  'PAYROLL',
  'DIRECT DEP',
  'DIRECT DEPOSIT',
  'SALARY',
  'WAGES',
  'ADP',
  'PAYCHEX',
  'GUSTO',
  'EMPLOYER',
];

const EXPLICIT_SUBSCRIPTION_KEYWORDS = [
  'SUBSCRIPTION',
  'RECURRING',
  'AUTOPAY',
  'MEMBERSHIP',
  'MONTHLY PAYMENT',
];

export function normalizeText(text: string): string {
  return text
    .toUpperCase()
    .replace(/\b\d{6,}\b/g, '')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function concatTransactionText(
  merchantName: string,
  descriptions: string[]
): string {
  const parts = [merchantName, ...descriptions].filter(Boolean);
  return normalizeText(parts.join(' '));
}

export function containsKeyword(text: string, keywords: string[]): string | null {
  const normalized = normalizeText(text);
  for (const keyword of keywords) {
    if (normalized.includes(keyword)) {
      return keyword;
    }
  }
  return null;
}

export function hasBillKeyword(text: string): boolean {
  return containsKeyword(text, BILL_KEYWORDS) !== null;
}

export function hasPayrollKeyword(text: string): boolean {
  return containsKeyword(text, PAYROLL_KEYWORDS) !== null;
}

export function hasExplicitSubscriptionText(text: string): boolean {
  return containsKeyword(text, EXPLICIT_SUBSCRIPTION_KEYWORDS) !== null;
}

export function hasMembershipKeyword(text: string): boolean {
  const normalized = normalizeText(text);
  return normalized.includes('MEMBERSHIP') || normalized.includes('ANNUAL MEMBER');
}

export function isPaymentProcessor(merchantName: string): boolean {
  const normalized = normalizeText(merchantName);
  return ['PAYPAL', 'VENMO', 'CASH APP', 'SQUARE', 'ZELLE'].some((p) =>
    normalized.includes(p)
  );
}

export function getDescriptionSubgroupKey(
  merchantName: string,
  description: string
): string {
  if (!isPaymentProcessor(merchantName)) {
    return String(description ? normalizeText(description).slice(0, 40) : merchantName);
  }
  return normalizeText(description);
}
