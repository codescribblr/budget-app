/**
 * Fuzzy string matching for header detection
 * Uses Levenshtein distance and synonym matching
 */

import { distance } from 'fastest-levenshtein';

export const FIELD_SYNONYMS = {
  date: [
    'date',
    'transaction date',
    'trans date',
    'post date',
    'posting date',
    'posted date',
    'value date',
    'booking date',
    'effective date',
    'settlement date',
    'fecha',
    'datum',
    'data',
    'tarih',
  ],
  amount: [
    'amount',
    'total',
    'sum',
    'value',
    'charge',
    'payment',
    'transaction amount',
    'monto',
    'betrag',
    'importo',
    'montant',
  ],
  description: [
    'description',
    'merchant',
    'payee',
    'memo',
    'details',
    'narrative',
    'reference',
    'merchant name',
    'vendor',
    'payee name',
    'transaction details',
    'descripción',
    'beschreibung',
  ],
  debit: [
    'debit',
    'withdrawal',
    'expense',
    'charge',
    'débito',
    'withdraw',
    'outgoing',
  ],
  credit: [
    'credit',
    'deposit',
    'income',
    'payment',
    'crédito',
    'incoming',
    'deposit amount',
  ],
  balance: [
    'balance',
    'running balance',
    'account balance',
    'current balance',
    'saldo',
    'guthaben',
  ],
};

export type FieldType = keyof typeof FIELD_SYNONYMS;

/**
 * Fuzzy match a header against a field type
 * Returns confidence score (0-1)
 */
export function fuzzyMatchHeader(
  header: string,
  fieldType: FieldType
): number {
  const normalized = header.toLowerCase().trim();
  const synonyms = FIELD_SYNONYMS[fieldType];

  // Exact match
  if (synonyms.includes(normalized)) {
    return 1.0;
  }

  // Contains match (header contains synonym or vice versa)
  const containsMatch = synonyms.some(
    s => normalized.includes(s) || s.includes(normalized)
  );
  if (containsMatch) {
    return 0.85;
  }

  // Levenshtein distance matching
  const distances = synonyms.map(s => distance(normalized, s));
  const minDistance = Math.min(...distances);

  // Score based on distance
  // Max distance of 5 for partial credit
  // Closer = higher score
  if (minDistance <= 2) {
    return 0.7;
  } else if (minDistance <= 4) {
    return 0.5;
  } else if (minDistance <= 6) {
    return 0.3;
  }

  return Math.max(0, 1 - (minDistance / 10));
}

/**
 * Find the best matching field type for a header
 * Returns the field type with highest confidence
 */
export function findBestFieldMatch(header: string): {
  fieldType: FieldType | null;
  confidence: number;
} {
  const fieldTypes = Object.keys(FIELD_SYNONYMS) as FieldType[];
  let bestMatch: FieldType | null = null;
  let bestScore = 0;

  for (const fieldType of fieldTypes) {
    const score = fuzzyMatchHeader(header, fieldType);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = fieldType;
    }
  }

  return {
    fieldType: bestMatch && bestScore > 0.3 ? bestMatch : null,
    confidence: bestScore,
  };
}


