import type { CadenceInfo, DetectionTransaction, RecurringFrequency } from '../types';
import { calculateIntervals, inferDateAnchorType } from '../utils/dates';
import { calculateMAD, calculateMedian, calculateVariance, getMostCommon } from '../utils/stats';
import { intervalConsistency } from './segment-by-gap';

function classifyFrequency(medianInterval: number): RecurringFrequency {
  if (medianInterval >= 360 && medianInterval <= 370) return 'yearly';
  if (medianInterval >= 85 && medianInterval <= 100) return 'quarterly';
  if (medianInterval >= 55 && medianInterval <= 65) return 'bimonthly';
  if (medianInterval >= 25 && medianInterval <= 35) return 'monthly';
  if (medianInterval >= 12 && medianInterval <= 16) return 'biweekly';
  if (medianInterval >= 6 && medianInterval <= 8) return 'weekly';
  if (medianInterval >= 1 && medianInterval <= 2) return 'daily';
  return 'custom';
}

export function inferCadence(transactions: DetectionTransaction[]): CadenceInfo | null {
  if (transactions.length < 2) {
    return {
      frequency: 'unknown',
      medianInterval: 0,
      intervalMAD: 0,
      dayOfMonth: null,
      dayOfWeek: null,
      dateAnchorType: 'unknown',
      dayOfMonthMAD: 0,
    };
  }

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const intervals = calculateIntervals(sorted.map((t) => t.date));
  if (intervals.some((interval) => interval < 6) && intervals.every((i) => i < 6)) {
    return null;
  }

  const medianInterval = calculateMedian(intervals);
  if (medianInterval < 6) return null;

  const intervalMAD = calculateMAD(intervals);
  if (!intervalConsistency(intervals) && transactions.length >= 3) {
    return null;
  }

  const frequency = classifyFrequency(medianInterval);
  const daysOfMonth = sorted.map((t) => new Date(t.date).getDate());
  const daysOfWeek = sorted.map((t) => new Date(t.date).getDay());
  const dayOfMonth = getMostCommon(daysOfMonth);
  const dayOfWeek = getMostCommon(daysOfWeek);
  const dayOfMonthMAD = calculateMAD(daysOfMonth);

  return {
    frequency,
    medianInterval,
    intervalMAD,
    dayOfMonth,
    dayOfWeek,
    dateAnchorType: inferDateAnchorType(daysOfMonth),
    dayOfMonthMAD,
  };
}

export function validateMonthlyDateAnchor(
  transactions: DetectionTransaction[],
  cadence: CadenceInfo
): boolean {
  if (cadence.frequency !== 'monthly') return true;
  if (transactions.length < 3) return true;

  const daysOfMonth = transactions.map((t) => new Date(t.date).getDate());
  const dayVariance = calculateVariance(daysOfMonth);
  const early = daysOfMonth.filter((d) => d <= 3).length;
  const late = daysOfMonth.filter((d) => d >= 28).length;
  const clustered = (early + late) / daysOfMonth.length >= 0.7;

  return dayVariance <= 50 || clustered || transactions.length >= 4;
}
