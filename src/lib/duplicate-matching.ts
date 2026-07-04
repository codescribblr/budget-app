import { distance } from 'fastest-levenshtein';

const ORIGINAL_DATA_METADATA_KEYS = new Set([
  'isDuplicate',
  'duplicateType',
  '_uploadFileName',
]);

export interface DuplicateMatchInput {
  description: string;
  merchant?: string | null;
  originalData?: unknown;
}

export interface ExistingTransactionForDuplicateMatch {
  description: string;
  merchantName?: string | null;
  originalImportTexts?: string[];
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

export function extractComparableTextsFromOriginalData(data: unknown): string[] {
  if (data === null || data === undefined) return [];

  let parsed: unknown = data;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      const text = data.trim();
      return text ? [text] : [];
    }
  }

  const texts: string[] = [];
  const addText = (value: unknown) => {
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).trim();
      if (text) texts.push(text);
    }
  };

  if (Array.isArray(parsed)) {
    parsed.forEach(addText);
    return texts;
  }

  if (typeof parsed === 'object' && parsed !== null) {
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (ORIGINAL_DATA_METADATA_KEYS.has(key)) continue;
      if (typeof value === 'object' && value !== null) continue;
      addText(value);
    }
  }

  return texts;
}

export function extractOriginalImportTexts(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== 'object') return [];

  const originalRow = (metadata as { originalRow?: unknown }).originalRow;
  return extractComparableTextsFromOriginalData(originalRow);
}

function getImportComparisonTexts(importTxn: DuplicateMatchInput): string[] {
  const texts = new Set<string>();
  if (importTxn.description?.trim()) texts.add(importTxn.description.trim());
  if (importTxn.merchant?.trim()) texts.add(importTxn.merchant.trim());
  for (const text of extractComparableTextsFromOriginalData(importTxn.originalData)) {
    texts.add(text);
  }
  return Array.from(texts);
}

function getExistingComparisonTexts(existing: ExistingTransactionForDuplicateMatch): string[] {
  const texts = new Set<string>();
  if (existing.description?.trim()) texts.add(existing.description.trim());
  if (existing.merchantName?.trim()) texts.add(existing.merchantName.trim());
  for (const text of existing.originalImportTexts || []) {
    if (text.trim()) texts.add(text.trim());
  }
  return Array.from(texts);
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

function merchantTokenAppearsInText(text: string, token: string): boolean {
  if (!token || token.length < 4) return false;
  const normalizedText = normalizeMerchantKey(text);
  return normalizedText.includes(token);
}

function textsMatchPair(existingText: string, importText: string): boolean {
  const existingDesc = normalizeComparableDescription(existingText);
  const importDesc = normalizeComparableDescription(importText);

  if (existingDesc === importDesc) {
    return true;
  }

  const longerDesc = existingDesc.length >= importDesc.length ? existingDesc : importDesc;
  const shorterDesc = existingDesc.length < importDesc.length ? existingDesc : importDesc;

  if (longerDesc.includes(shorterDesc) && shorterDesc.length >= 4) {
    return true;
  }

  const importToken = getPrimaryMerchantKey(importText);
  if (importToken) {
    const existingFirstToken = normalizeMerchantKey(existingText.split(/\s+/)[0] || '');
    if (merchantKeysMatch(importToken, existingFirstToken)) {
      return true;
    }
    if (merchantTokenAppearsInText(existingText, importToken)) {
      return true;
    }
  }

  const existingCore = extractCoreDescription(existingText);
  const importCore = extractCoreDescription(importText);
  if (existingCore && importCore && existingCore === importCore) {
    return true;
  }

  const descDistance = distance(existingDesc, importDesc);
  const maxLength = Math.max(existingDesc.length, importDesc.length);
  return maxLength > 0 && (1 - descDistance / maxLength) > 0.75;
}

/**
 * Compare import text against an existing transaction description/merchant/raw import data.
 * Date and amount are expected to match before calling this.
 */
export function descriptionsMatchForDuplicate(
  existing: ExistingTransactionForDuplicateMatch,
  importTxn: DuplicateMatchInput
): boolean {
  const importTexts = getImportComparisonTexts(importTxn);
  const existingTexts = getExistingComparisonTexts(existing);

  for (const importText of importTexts) {
    for (const existingText of existingTexts) {
      if (textsMatchPair(existingText, importText)) {
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

export function getOriginalImportTextsFromLinks(
  links: Array<{
    imported_transactions?:
      | {
          description?: string | null;
          merchant?: string | null;
          metadata?: unknown;
        }
      | {
          description?: string | null;
          merchant?: string | null;
          metadata?: unknown;
        }[]
      | null;
  }> | null | undefined
): string[] {
  if (!links || links.length === 0) return [];

  const texts = new Set<string>();
  for (const link of links) {
    const imported = Array.isArray(link.imported_transactions)
      ? link.imported_transactions[0]
      : link.imported_transactions;
    if (!imported) continue;

    if (imported.description?.trim()) texts.add(imported.description.trim());
    if (imported.merchant?.trim()) texts.add(imported.merchant.trim());
    for (const text of extractOriginalImportTexts(imported.metadata)) {
      texts.add(text);
    }
  }

  return Array.from(texts);
}
