import type { DetectionTransaction } from '../types';
import { daysBetween } from '../utils/dates';
import { calculateMAD, calculateMedian } from '../utils/stats';

function gapThreshold(medianInterval: number, frequencyFloor: number): number {
  return Math.max(2 * medianInterval, frequencyFloor);
}

export function segmentByGap(
  transactions: DetectionTransaction[]
): DetectionTransaction[] {
  if (transactions.length <= 1) return transactions;

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(daysBetween(sorted[i - 1].date, sorted[i].date));
  }

  const medianInterval = calculateMedian(intervals);
  const floor =
    medianInterval >= 25 ? 45 :
    medianInterval >= 12 ? 21 : 14;

  const threshold = gapThreshold(medianInterval, floor);

  let segmentStart = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap = daysBetween(sorted[i - 1].date, sorted[i].date);
    if (gap > threshold) {
      segmentStart = i;
    }
  }

  return sorted.slice(segmentStart);
}

export function passesRecencyGate(
  transactions: DetectionTransaction[],
  medianInterval: number
): boolean {
  if (transactions.length === 0) return false;
  const lastDate = transactions[transactions.length - 1].date;
  const daysSinceLast = daysBetween(lastDate, new Date().toISOString().split('T')[0]);
  const maxGap = Math.max(medianInterval * 1.5, medianInterval >= 25 ? 45 : 30);
  return daysSinceLast <= maxGap;
}

export function intervalConsistency(intervals: number[]): boolean {
  if (intervals.length === 0) return false;
  const median = calculateMedian(intervals);
  if (median === 0) return false;
  const mad = calculateMAD(intervals);
  return mad / median <= 0.25;
}
