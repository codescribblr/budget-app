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
 * US date format patterns (MM/dd) - prioritized
 * Supports zero-padded and non-zero-padded months/days
 */
export const US_DATE_FORMATS = [
  'MM/dd/yyyy',  // 02/04/2025
  'M/dd/yyyy',   // 2/04/2025
  'MM/d/yyyy',   // 02/4/2025
  'M/d/yyyy',    // 2/4/2025
  'MM-dd-yyyy',  // 02-04-2025
  'M-dd-yyyy',   // 2-04-2025
  'MM-d-yyyy',   // 02-4-2025
  'M-d-yyyy',    // 2-4-2025
  'MM/dd/yy',    // 02/04/25
  'M/d/yy',      // 2/4/25
] as const;

/**
 * Other date format patterns (European, ISO, etc.)
 */
export const OTHER_DATE_FORMATS = [
  'yyyy-MM-dd',
  'yyyy/MM/dd',
  'MMM dd, yyyy',
  'MMM d, yyyy',
  'dd/MM/yyyy',
  'dd-MM-yyyy',
  'dd.MM.yyyy',
  'dd/MM/yy',
  'dd-MM-yy',
] as const;

/**
 * All date format patterns (US formats first)
 */
export const DATE_FORMATS = [...US_DATE_FORMATS, ...OTHER_DATE_FORMATS] as const;

/**
 * Validate that parsed date matches expected values from the string
 */
function validateParsedDate(
  parsed: Date,
  trimmed: string,
  fmt: string
): boolean {
  const month = parsed.getMonth() + 1; // getMonth() returns 0-11
  const day = parsed.getDate();
  
  // Only validate numeric formats (skip text-based formats like "MMM dd, yyyy")
  if (fmt.includes('MMM')) {
    return true; // Skip validation for text-based formats
  }
  
  // Extract expected values from the string based on format
  const parts = trimmed.split(/[\/\-\s,\.]+/).filter(p => p.trim() !== '');
  if (parts.length < 3) {
    return true; // Can't validate, accept it
  }
  
  // Check if all parts are numeric
  const allNumeric = parts.every(p => /^\d+$/.test(p.trim()));
  if (!allNumeric) {
    return true; // Not all numeric, skip validation
  }
  
  let expectedMonth: number | null = null;
  let expectedDay: number | null = null;
  
  if ((fmt.startsWith('MM') || fmt.startsWith('M/') || fmt.startsWith('M-')) && !fmt.startsWith('MMM')) {
    // US format: MM/dd/yyyy, M/dd/yyyy, MM/d/yyyy, M/d/yyyy, etc.
    expectedMonth = parseInt(parts[0], 10);
    expectedDay = parseInt(parts[1], 10);
  } else if (fmt.startsWith('dd')) {
    // European format: dd/MM/yyyy or dd-MM-yyyy
    expectedDay = parseInt(parts[0], 10);
    expectedMonth = parseInt(parts[1], 10);
  } else if (fmt.startsWith('yyyy')) {
    // ISO format: yyyy-MM-dd or yyyy/MM/dd
    expectedMonth = parseInt(parts[1], 10);
    expectedDay = parseInt(parts[2], 10);
  }
  
  // Validate that parsed values match expected values
  if (expectedMonth !== null && expectedDay !== null) {
    // Check if month is valid (1-12) and day is reasonable (1-31)
    if (expectedMonth >= 1 && expectedMonth <= 12 && expectedDay >= 1 && expectedDay <= 31) {
      // Values must match exactly
      return month === expectedMonth && day === expectedDay;
    }
  }
  
  return true; // Can't validate, accept it
}

/**
 * Parse a date string with multiple format attempts
 * Prioritizes US format (MM/dd/yyyy) for ambiguous dates
 */
export function parseDate(dateStr: string, detectedFormat?: string): DateParseResult {
  const trimmed = dateStr.trim();
  if (!trimmed) {
    return { date: null, format: null, confidence: 0 };
  }

  // Check if this looks like a US date format (MM/dd or M/d with slashes)
  const looksLikeUSDate = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(trimmed);

  // If it looks like a US date and detected format is European, ignore detected format
  // This prevents saved templates with wrong format from causing issues
  const isEuropeanFormat = detectedFormat && (
    detectedFormat.toLowerCase().startsWith('dd/') ||
    detectedFormat.toLowerCase().startsWith('dd-') ||
    detectedFormat.toLowerCase().startsWith('dd.')
  );
  
  // Try detected format first if provided (unless it's European format for US-looking dates)
  if (detectedFormat && !(looksLikeUSDate && isEuropeanFormat)) {
    const formatMap: Record<string, string> = {
      'MM/DD/YYYY': 'MM/dd/yyyy',
      'M/DD/YYYY': 'M/dd/yyyy',
      'MM/D/YYYY': 'MM/d/yyyy',
      'M/D/YYYY': 'M/d/yyyy',
      'DD-MM-YYYY': 'dd-MM-yyyy',
      'DD.MM.YYYY': 'dd.MM.yyyy',
      'YYYY-MM-DD': 'yyyy-MM-dd',
      'MMM DD, YYYY': 'MMM dd, yyyy',
      'MM/DD/YY': 'MM/dd/yy',
      'M/D/YY': 'M/d/yy',
      'YYYY/MM/DD': 'yyyy/MM/dd',
    };

    const mappedFormat = formatMap[detectedFormat] || detectedFormat.toLowerCase();
    const parsed = parse(trimmed, mappedFormat, new Date());
    if (isValid(parsed)) {
      const year = parsed.getFullYear();
      if (year >= 1900 && year <= 2100) {
        // Validate that parsed values match expected values
        if (validateParsedDate(parsed, trimmed, mappedFormat)) {
          return { date: parsed, format: mappedFormat, confidence: 1.0 };
        }
        // If validation fails, fall through to try other formats
      }
    }
  }

  // If it looks like a US date format, ONLY try US formats (skip European formats)
  // This prevents ambiguous dates like "11/01/2025" from being parsed as dd/MM/yyyy
  if (looksLikeUSDate) {
    for (const fmt of US_DATE_FORMATS) {
      try {
        const parsed = parse(trimmed, fmt, new Date());
        if (isValid(parsed)) {
          const year = parsed.getFullYear();
          if (year >= 1900 && year <= 2100) {
            // Validate that parsed values match expected values
            if (validateParsedDate(parsed, trimmed, fmt)) {
              return { date: parsed, format: fmt, confidence: 0.95 };
            }
            // If validation fails, continue to next format
          }
        }
      } catch {
        // Continue to next format
      }
    }
    // If US formats didn't work, don't try European formats - return null
    // This ensures we don't misinterpret ambiguous dates
    return { date: null, format: null, confidence: 0 };
  }

  // Try all known formats (for non-US-looking dates)
  for (const fmt of DATE_FORMATS) {
    try {
      const parsed = parse(trimmed, fmt, new Date());
      if (isValid(parsed)) {
        // Validate that the parsed date makes sense
        const year = parsed.getFullYear();
        if (year >= 1900 && year <= 2100) {
          // Validate that parsed values match expected values
          if (validateParsedDate(parsed, trimmed, fmt)) {
            return { date: parsed, format: fmt, confidence: 0.9 };
          }
          // If validation fails, continue to next format
          continue;
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
 * Prioritizes US formats for ambiguous dates
 */
export function detectDateFormat(values: string[]): string | null {
  if (values.length === 0) return null;

  const formatScores = new Map<string, number>();

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;

    // Check if this looks like a US date format
    const looksLikeUSDate = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(trimmed);

    // Try US formats first for dates that look like US format
    const formatsToTry = looksLikeUSDate 
      ? [...US_DATE_FORMATS, ...OTHER_DATE_FORMATS]
      : DATE_FORMATS;

    for (const fmt of formatsToTry) {
      try {
        const parsed = parse(trimmed, fmt, new Date());
        if (isValid(parsed)) {
          const year = parsed.getFullYear();
          if (year >= 1900 && year <= 2100) {
            // Only count formats that pass validation
            if (validateParsedDate(parsed, trimmed, fmt)) {
              // Give higher weight to US formats for ambiguous dates
              const isUSFormat = (US_DATE_FORMATS as readonly string[]).includes(fmt);
              const weight = looksLikeUSDate && isUSFormat ? 2 : 1;
              formatScores.set(fmt, (formatScores.get(fmt) || 0) + weight);
            }
          }
        }
      } catch {
        // Continue
      }
    }
  }

  if (formatScores.size === 0) return null;

  // Check if all dates looked like US dates
  const allLookedLikeUS = values.every(v => /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(v.trim()));
  
  // If all dates look like US dates, filter out European formats
  const validFormats = allLookedLikeUS
    ? Array.from(formatScores.entries()).filter(([fmt]) => {
        const isUSFormat = (US_DATE_FORMATS as readonly string[]).includes(fmt);
        return isUSFormat;
      })
    : Array.from(formatScores.entries());
  
  if (validFormats.length === 0) return null;

  // Return most common format
  const sorted = validFormats.sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

