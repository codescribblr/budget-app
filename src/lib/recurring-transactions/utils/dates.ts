import type { DateAnchorType, RecurringFrequency } from '../types';

export function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function calculateIntervals(dates: string[]): number[] {
  const intervals: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    intervals.push(daysBetween(dates[i - 1], dates[i]));
  }
  return intervals;
}

export function calculateNextDate(
  lastDate: Date,
  frequency: RecurringFrequency,
  dayOfMonth: number | null
): Date {
  const next = new Date(lastDate);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
    case 'bimonthly':
      next.setMonth(next.getMonth() + (frequency === 'bimonthly' ? 2 : 1));
      if (dayOfMonth !== null) {
        const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(dayOfMonth, lastDayOfMonth));
      }
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      if (dayOfMonth !== null) {
        const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(dayOfMonth, lastDayOfMonth));
      }
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setDate(next.getDate() + 30);
      break;
  }

  return next;
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function inferDateAnchorType(daysOfMonth: number[]): DateAnchorType {
  if (daysOfMonth.length === 0) return 'unknown';
  const early = daysOfMonth.filter((d) => d >= 1 && d <= 3).length;
  const late = daysOfMonth.filter((d) => d >= 28).length;
  if ((early + late) / daysOfMonth.length >= 0.7) {
    return early >= late ? 'month_start' : 'month_end';
  }
  return 'fixed_day';
}

export function monthsBetween(firstDate: string, lastDate: string): number {
  return daysBetween(firstDate, lastDate) / 30;
}
