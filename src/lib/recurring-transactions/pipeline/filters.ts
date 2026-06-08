import type { DetectionTransaction } from '../types';

const SYSTEM_MERCHANT_PREFIX = /^system:/i;

export function isExcludedMerchant(merchantName: string): boolean {
  return SYSTEM_MERCHANT_PREFIX.test(merchantName.trim());
}

export function filterValidTransactions(
  transactions: DetectionTransaction[]
): DetectionTransaction[] {
  return transactions.filter(
    (txn) => txn.merchant_group_id && !isExcludedMerchant(txn.merchant_name)
  );
}
