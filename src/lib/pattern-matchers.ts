/**
 * Pattern matchers for detecting column types in CSV files
 * Analyzes content patterns to identify dates, amounts, descriptions, etc.
 */

export interface DatePattern {
  regex: RegExp;
  format: string;
}

export const DATE_PATTERNS: DatePattern[] = [
  { regex: /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, format: 'MM/DD/YYYY' },
  { regex: /^\d{4}-\d{2}-\d{2}$/, format: 'YYYY-MM-DD' },
  { regex: /^\d{2}-\d{2}-\d{4}$/, format: 'DD-MM-YYYY' },
  { regex: /^\d{2}\.\d{2}\.\d{4}$/, format: 'DD.MM.YYYY' },
  { regex: /^\d{1,2}\.\d{1,2}\.\d{2,4}$/, format: 'DD.MM.YYYY' },
  { regex: /^[A-Za-z]{3}\s+\d{1,2},?\s+\d{4}$/, format: 'MMM DD, YYYY' },
  { regex: /^\d{1,2}\/\d{1,2}\/\d{2}$/, format: 'MM/DD/YY' },
  { regex: /^\d{4}\/\d{2}\/\d{2}$/, format: 'YYYY/MM/DD' },
  { regex: /^\d{1,2}-\d{1,2}-\d{2,4}$/, format: 'MM-DD-YYYY' },
];

export const AMOUNT_PATTERNS = [
  /^-?\$?\d{1,3}(,?\d{3})*(\.\d{2})?$/,  // $1,234.56 or -1234.56
  /^-?\d{1,3}(\.\d{3})*(,\d{2})?$/,      // 1.234,56 (European)
  /^\(\d+\.\d{2}\)$/,                    // (123.45) negative
  /^-?\d+\.\d{2}$/,                      // Simple decimal
  /^-?\$\d+\.\d{2}$/,                    // $123.45
];

/**
 * Analyze if a column contains dates
 * Returns confidence score (0-1) and detected format
 */
export function isDateColumn(values: string[]): { score: number; format: string | null } {
  if (values.length === 0) return { score: 0, format: null };

  let matches = 0;
  let detectedFormat: string | null = null;
  const formatCounts = new Map<string, number>();

  for (const value of values) {
    // Remove quotes if present
    let trimmed = value.trim().replace(/^["']|["']$/g, '');
    if (!trimmed) continue;

    let matched = false;
    for (const { regex, format } of DATE_PATTERNS) {
      if (regex.test(trimmed)) {
        matches++;
        matched = true;
        formatCounts.set(format, (formatCounts.get(format) || 0) + 1);
        if (!detectedFormat) detectedFormat = format;
        break;
      }
    }

    // Also check if it's a valid date string that JavaScript can parse
    if (!matched) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime()) && trimmed.length >= 8) {
        matches++;
        if (!detectedFormat) detectedFormat = 'auto';
      }
    }
  }

  // Use most common format
  if (formatCounts.size > 0) {
    const sorted = Array.from(formatCounts.entries()).sort((a, b) => b[1] - a[1]);
    detectedFormat = sorted[0][0];
  }

  return {
    score: matches / values.length,
    format: detectedFormat,
  };
}

/**
 * Analyze if a column contains amounts/currency values
 * Returns confidence score (0-1)
 */
export function isAmountColumn(values: string[]): number {
  if (values.length === 0) return 0;

  const matches = values.filter(v => {
    // Remove quotes if present
    let trimmed = v.trim().replace(/^["']|["']$/g, '');
    if (!trimmed) return false;

    // First check if it looks like a date (dates should not be amounts)
    // Check for common date separators
    if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(trimmed)) {
      return false; // This looks like a date, not an amount
    }

    // Check against all amount patterns
    if (AMOUNT_PATTERNS.some(pattern => pattern.test(trimmed))) {
      return true;
    }

    // Check if it's a parseable number (but exclude dates)
    const cleaned = trimmed.replace(/[$,\s()]/g, '');
    // Don't match if it contains slashes (likely a date)
    if (cleaned.includes('/')) return false;
    const num = parseFloat(cleaned);
    return !isNaN(num) && Math.abs(num) < 1000000 && !cleaned.includes('/'); // Reasonable transaction amount
  }).length;

  return matches / values.length;
}

/**
 * Analyze if a column contains descriptions/text
 * Returns confidence score (0-1)
 */
export function isDescriptionColumn(values: string[]): number {
  if (values.length === 0) return 0;

  const textValues = values.filter(v => {
    const trimmed = v.trim();
    if (!trimmed) return false;

    // Must have reasonable length
    if (trimmed.length < 2 || trimmed.length > 200) return false;

    // Must contain letters (not just numbers/symbols)
    if (!/[a-zA-Z]/.test(trimmed)) return false;

    // Should not be just numbers
    if (/^\d+$/.test(trimmed)) return false;

    // Should not be just a date
    if (DATE_PATTERNS.some(p => p.regex.test(trimmed))) return false;

    // Should not be just an amount
    if (AMOUNT_PATTERNS.some(p => p.test(trimmed))) return false;

    return true;
  }).length;

  return textValues / values.length;
}

/**
 * Check if a column looks like a balance/running total
 * These should typically be ignored
 */
export function isBalanceColumn(values: string[]): number {
  if (values.length === 0) return 0;

  // Balance columns often:
  // 1. Are always positive (or mostly positive)
  // 2. Show increasing/decreasing trends
  // 3. Are in the last column
  // 4. Have values that are larger than typical transaction amounts

  const numericValues = values
    .map(v => {
      const cleaned = v.trim().replace(/[$,\s()]/g, '');
      return parseFloat(cleaned);
    })
    .filter(n => !isNaN(n));

  if (numericValues.length === 0) return 0;

  // Check if values are consistently large (likely balance)
  const avgValue = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
  const allPositive = numericValues.every(v => v >= 0);
  const mostlyPositive = numericValues.filter(v => v >= 0).length / numericValues.length > 0.8;

  // If average is very large and mostly positive, likely a balance
  if (avgValue > 1000 && (allPositive || mostlyPositive)) {
    return 0.7;
  }

  return 0;
}

