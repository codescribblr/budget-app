import type { DetectionTransaction } from '../types';

export function groupBySimilarAmount(
  transactions: DetectionTransaction[],
  minGroupSize = 2
): DetectionTransaction[][] {
  const groups: DetectionTransaction[][] = [];
  const processed = new Set<number>();

  for (const txn of transactions) {
    if (processed.has(txn.id)) continue;

    const group = [txn];
    processed.add(txn.id);

    for (const otherTxn of transactions) {
      if (processed.has(otherTxn.id)) continue;

      const amountDiff = Math.abs(txn.total_amount - otherTxn.total_amount);
      const dollarThreshold = Math.max(5, txn.total_amount * 0.05);
      const percentDiff = txn.total_amount > 0 ? amountDiff / txn.total_amount : 1;

      if (amountDiff <= dollarThreshold || percentDiff <= 0.05) {
        group.push(otherTxn);
        processed.add(otherTxn.id);
      }
    }

    if (group.length >= minGroupSize) {
      groups.push(group);
    }
  }

  return groups;
}

export function isVariableAmountCluster(amounts: number[]): boolean {
  if (amounts.length < 4) return false;
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  if (min === 0) return max > 0;
  const ratio = max / min;
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance =
    amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
  const cv = Math.sqrt(variance) / mean;
  return cv > 0.15 || ratio > 1.5;
}
