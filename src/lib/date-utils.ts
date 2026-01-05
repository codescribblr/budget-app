/**
 * Timezone-safe date utilities for handling date-only values (yyyy-MM-dd)
 * 
 * The problem: When you do `new Date('2024-11-21')`, JavaScript interprets this as
 * UTC midnight, which in ET (UTC-5) becomes 2024-11-20 at 7:00 PM.
 * 
 * The solution: Always parse and format dates in the local timezone.
 */

/**
 * Parse a date string (yyyy-MM-dd) as a local date at midnight
 * This prevents timezone conversion issues
 * 
 * @param dateString - Date string in 'yyyy-MM-dd' format
 * @returns Date object at midnight local time, or undefined if invalid
 */
export function parseLocalDate(dateString: string | null | undefined): Date | undefined {
  if (!dateString) return undefined;
  
  // Split the date string and create a Date using local timezone
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Validate the parsed values
  if (!year || !month || !day) return undefined;
  
  // Month is 0-indexed in JavaScript Date
  const date = new Date(year, month - 1, day);
  
  // Verify the date is valid and matches what we parsed
  // (handles invalid dates like 2024-02-30)
  if (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  ) {
    return date;
  }
  
  return undefined;
}

/**
 * Format a Date object to 'yyyy-MM-dd' string using local timezone
 * 
 * @param date - Date object to format
 * @returns Date string in 'yyyy-MM-dd' format, or empty string if invalid
 */
export function formatLocalDate(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date at midnight local time
 * 
 * @returns Date object for today at midnight
 */
export function getTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Check if a date string is in the future (compared to today)
 * 
 * @param dateString - Date string in 'yyyy-MM-dd' format
 * @returns true if the date is in the future
 */
export function isFutureDate(dateString: string | null | undefined): boolean {
  const date = parseLocalDate(dateString);
  if (!date) return false;
  
  const today = getTodayLocal();
  return date > today;
}

/**
 * Check if a date string is today
 * 
 * @param dateString - Date string in 'yyyy-MM-dd' format
 * @returns true if the date is today
 */
export function isToday(dateString: string | null | undefined): boolean {
  const date = parseLocalDate(dateString);
  if (!date) return false;
  
  const today = getTodayLocal();
  return formatLocalDate(date) === formatLocalDate(today);
}


