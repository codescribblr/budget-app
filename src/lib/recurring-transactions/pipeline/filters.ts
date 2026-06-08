import type { DetectionTransaction } from '../types';

export function hasValidSplits(txn: DetectionTransaction): boolean {
  if (txn.splits.length === 0) return true;
  return txn.splits.some((split) => !split.is_system && !split.is_buffer);
}

export function filterValidTransactions(
  transactions: DetectionTransaction[]
): DetectionTransaction[] {
  return transactions.filter(
    (txn) => txn.merchant_group_id && hasValidSplits(txn)
  );
}
