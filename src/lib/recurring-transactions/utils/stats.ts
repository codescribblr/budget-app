export function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
}

export function calculateMAD(values: number[]): number {
  if (values.length === 0) return 0;
  const median = calculateMedian(values);
  const deviations = values.map((v) => Math.abs(v - median));
  return calculateMedian(deviations);
}

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function calculateCV(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  if (mean === 0) return 0;
  return Math.sqrt(calculateVariance(values)) / mean;
}

export function getMostCommon<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  const counts = new Map<T, number>();
  for (const val of arr) {
    counts.set(val, (counts.get(val) || 0) + 1);
  }
  let maxCount = 0;
  let mostCommon = arr[0];
  for (const [val, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = val;
    }
  }
  return mostCommon;
}

export function amountBucket(amount: number): number {
  return Math.round(amount / 5) * 5;
}
