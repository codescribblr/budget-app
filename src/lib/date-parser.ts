/**
 * Enhanced date parsing with format detection
 * Handles multiple date formats reliably
 */

import { parse, isValid, format } from 'date-fns';
import { parseLocalDate as parseLocalDateUtil } from './date-utils';

export interface DateParseResult {
  date: Date | null;
  format: string | null;
  confidence: number;
}

/**
 * Common date format patterns
 */
export const DATE_FORMATS = [
  'MM/dd/yyyy',
  'dd/MM/yyyy',
  'yyyy-MM-dd',
  'dd-MM-yyyy',
  'dd.MM.yyyy',
  'MMM dd, yyyy',
  'MMM d, yyyy',
  'MM/dd/yy',
  'dd/MM/yy',
  'yyyy/MM/dd',
  'MM-dd-yyyy',
  'dd-MM-yy',
] as const;

/**
 * Parse a date string with multiple format attempts
 */
export function parseDate(dateStr: string, detectedFormat?: string): DateParseResult {
  const trimmed = dateStr.trim();
  if (!trimmed) {
    return { date: null, format: null, confidence: 0 };
  }

  // Try detected format first if provided
  if (detectedFormat) {
    const formatMap: Record<string, string> = {
      'MM/DD/YYYY': 'MM/dd/yyyy',
      'DD-MM-YYYY': 'dd-MM-yyyy',
      'DD.MM.YYYY': 'dd.MM.yyyy',
      'YYYY-MM-DD': 'yyyy-MM-dd',
      'MMM DD, YYYY': 'MMM dd, yyyy',
      'MM/DD/YY': 'MM/dd/yy',
      'YYYY/MM/DD': 'yyyy/MM/dd',
    };

    const mappedFormat = formatMap[detectedFormat] || detectedFormat.toLowerCase();
    const parsed = parse(trimmed, mappedFormat, new Date());
    if (isValid(parsed)) {
      return { date: parsed, format: mappedFormat, confidence: 1.0 };
    }
  }

  // Try all known formats
  for (const fmt of DATE_FORMATS) {
    try {
      const parsed = parse(trimmed, fmt, new Date());
      if (isValid(parsed)) {
        // Validate that the parsed date makes sense
        const year = parsed.getFullYear();
        if (year >= 1900 && year <= 2100) {
          return { date: parsed, format: fmt, confidence: 0.9 };
        }
      }
    } catch {
      // Continue to next format
    }
  }

  // Fallback: Try to parse as 'yyyy-MM-dd' format using timezone-safe utility
  // This handles dates that are already in the correct format but weren't caught above
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const localDate = parseLocalDateUtil(trimmed);
    if (localDate) {
      return { date: localDate, format: 'yyyy-MM-dd', confidence: 0.8 };
    }
  }

  // If all else fails, return null rather than using new Date() which interprets as UTC
  // This prevents timezone-related date shifts
  return { date: null, format: null, confidence: 0 };
}

/**
 * Normalize date to YYYY-MM-DD format
 * Uses timezone-safe formatting to prevent date shifts
 */
export function normalizeDate(date: Date | string): string {
  let dateObj: Date;

  if (typeof date === 'string') {
    const parsed = parseDate(date);
    if (!parsed.date) {
      return date; // Return as-is if can't parse
    }
    dateObj = parsed.date;
  } else {
    dateObj = date;
  }

  // Use timezone-safe formatting from date-utils
  // This ensures the date is formatted using local timezone methods
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Detect date format from sample values
 */
export function detectDateFormat(values: string[]): string | null {
  if (values.length === 0) return null;

  const formatScores = new Map<string, number>();

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;

    for (const fmt of DATE_FORMATS) {
      try {
        const parsed = parse(trimmed, fmt, new Date());
        if (isValid(parsed)) {
          const year = parsed.getFullYear();
          if (year >= 1900 && year <= 2100) {
            formatScores.set(fmt, (formatScores.get(fmt) || 0) + 1);
          }
        }
      } catch {
        // Continue
      }
    }
  }

  if (formatScores.size === 0) return null;

  // Return most common format
  const sorted = Array.from(formatScores.entries()).sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

