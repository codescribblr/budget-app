import type { DetectionTransaction } from '../types';

const SYSTEM_MERCHANT_PREFIX = /^system:/i;

export function isExcludedMerchant(merchantName: string): boolean {
  return SYSTEM_MERCHANT_PREFIX.test(merchantName.trim());
}

/** Transaction is eligible when it has at least one non-system, non-buffer category split. */
export function hasEligibleCategorySplit(transaction: DetectionTransaction): boolean {
  const splits = transaction.splits;
  if (splits.length === 0) return true;
  return splits.some((split) => !split.is_system && !split.is_buffer);
}

export function filterValidTransactions(
  transactions: DetectionTransaction[]
): DetectionTransaction[] {
  return transactions.filter(
    (txn) =>
      txn.merchant_group_id &&
      !isExcludedMerchant(txn.merchant_name) &&
      hasEligibleCategorySplit(txn)
  );
}
