import { distance } from 'fastest-levenshtein';

export interface DuplicateMatchInput {
  description: string;
  merchant?: string | null;
}

export interface ExistingTransactionForDuplicateMatch {
  description: string;
  merchantName?: string | null;
}

export function normalizeComparableDescription(description: string): string {
  return description.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeMerchantKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function normalizeAmountKey(amount: number): string {
  return Math.abs(amount).toFixed(2);
}

export function getPrimaryMerchantKey(description: string, merchant?: string | null): string | null {
  const source = (merchant?.trim() || description.trim());
  const firstWord = source.split(/\s+/)[0] || '';
  const key = normalizeMerchantKey(firstWord);
  return key.length >= 4 ? key : null;
}

function extractCoreDescription(description: string): string | null {
  let normalized = description.trim();

  normalized = normalized.replace(/\s+[A-Z0-9]+\.(COM|NET|ORG|EDU|GOV|IO|CO|US|UK|CA|AU)\b/gi, '');
  normalized = normalized.replace(/\s+\.(COM|NET|ORG|EDU|GOV|IO|CO|US|UK|CA|AU)\b/gi, '');

  const words = normalized.split(/\s+/);
  const seen = new Set<string>();
  const uniqueWords = words.filter((word) => {
    const lowerWord = word.toLowerCase();
    if (seen.has(lowerWord)) return false;
    seen.add(lowerWord);
    return true;
  });
  normalized = uniqueWords.join(' ');

  const suffixes = [
    /\s+INC\.?$/i,
    /\s+LLC\.?$/i,
    /\s+LTD\.?$/i,
    /\s+CORP\.?$/i,
    /\s+CO\.?$/i,
    /\s+COMPANY$/i,
  ];

  suffixes.forEach((suffix) => {
    normalized = normalized.replace(suffix, '');
  });

  normalized = normalized.replace(/\s+/g, ' ').trim();

  if (!normalized || normalized.length < 5) {
    return null;
  }

  return normalized.toLowerCase();
}

function merchantKeysMatch(importKey: string, existingKey: string): boolean {
  if (!importKey || !existingKey || importKey.length < 4 || existingKey.length < 4) {
    return false;
  }

  return existingKey.startsWith(importKey) || importKey.startsWith(existingKey);
}

/**
 * Compare import text against an existing transaction description/merchant.
 * Date and amount are expected to match before calling this.
 */
export function descriptionsMatchForDuplicate(
  existing: ExistingTransactionForDuplicateMatch,
  importTxn: DuplicateMatchInput
): boolean {
  const existingDesc = normalizeComparableDescription(existing.description);
  const importDesc = normalizeComparableDescription(importTxn.description);
  const importMerchant = importTxn.merchant?.trim()
    ? normalizeComparableDescription(importTxn.merchant)
    : '';

  if (existingDesc === importDesc) {
    return true;
  }

  if (importMerchant && (existingDesc === importMerchant || importMerchant === existingDesc)) {
    return true;
  }

  const longerDesc = existingDesc.length >= importDesc.length ? existingDesc : importDesc;
  const shorterDesc = existingDesc.length < importDesc.length ? existingDesc : importDesc;

  if (longerDesc.includes(shorterDesc) && shorterDesc.length >= 4) {
    return true;
  }

  if (importMerchant) {
    if (existingDesc.includes(importMerchant) || importMerchant.includes(existingDesc)) {
      return true;
    }
  }

  const importToken = getPrimaryMerchantKey(importTxn.description, importTxn.merchant);
  if (importToken) {
    const existingFirstToken = normalizeMerchantKey(existing.description.split(/\s+/)[0] || '');
    if (merchantKeysMatch(importToken, existingFirstToken)) {
      return true;
    }

    const existingMerchantName = existing.merchantName?.trim();
    if (existingMerchantName) {
      const existingMerchantToken = getPrimaryMerchantKey(existingMerchantName);
      if (existingMerchantToken && merchantKeysMatch(importToken, existingMerchantToken)) {
        return true;
      }
    }
  }

  const existingCore = extractCoreDescription(existing.description);
  const importCore = extractCoreDescription(importTxn.description);
  if (existingCore && importCore && existingCore === importCore) {
    return true;
  }

  const comparisonTargets = [importDesc, importMerchant].filter(Boolean);
  const existingTargets = [existingDesc, existing.merchantName?.trim().toLowerCase() || ''].filter(Boolean);

  for (const target of comparisonTargets) {
    for (const existingTarget of existingTargets) {
      const descDistance = distance(existingTarget, target);
      const maxLength = Math.max(existingTarget.length, target.length);
      if (maxLength > 0 && (1 - descDistance / maxLength) > 0.75) {
        return true;
      }
    }
  }

  return false;
}

export function parseDateAmountDescriptionKey(key: string): {
  date: string;
  description: string;
  amount: number;
} {
  const parts = key.split('|');
  const date = parts[0];
  const amountStr = parts[parts.length - 1];
  const description = parts.slice(1, -1).join('|');
  return { date, description, amount: parseFloat(amountStr) };
}

export function getMerchantNameFromTransactionRow(transaction: {
  description: string;
  merchant_groups?:
    | {
        display_name?: string | null;
        global_merchants?: { display_name?: string | null } | { display_name?: string | null }[] | null;
      }
    | {
        display_name?: string | null;
        global_merchants?: { display_name?: string | null } | { display_name?: string | null }[] | null;
      }[]
    | null;
  merchant_override?:
    | { display_name?: string | null }
    | { display_name?: string | null }[]
    | null;
}): string | null {
  const merchantGroup = Array.isArray(transaction.merchant_groups)
    ? transaction.merchant_groups[0]
    : transaction.merchant_groups;
  const merchantOverride = Array.isArray(transaction.merchant_override)
    ? transaction.merchant_override[0]
    : transaction.merchant_override;

  const overrideName = merchantOverride?.display_name?.trim();
  if (overrideName) return overrideName;

  const globalMerchants = merchantGroup?.global_merchants;
  const globalMerchant = Array.isArray(globalMerchants) ? globalMerchants[0] : globalMerchants;
  const globalName = globalMerchant?.display_name?.trim();
  if (globalName) return globalName;

  const groupName = merchantGroup?.display_name?.trim();
  if (groupName) return groupName;

  return null;
}
