import type { DetectionTransaction } from '../types';
import { getDescriptionSubgroupKey } from '../classification/text-utils';

export interface CandidateGroup {
  merchantGroupId: number;
  merchantName: string;
  transactionType: 'income' | 'expense';
  accountId: number | null;
  creditCardId: number | null;
  subgroupKey: string;
  transactions: DetectionTransaction[];
}

function paymentSourceKey(txn: DetectionTransaction): string {
  return `${txn.account_id ?? 'none'}:${txn.credit_card_id ?? 'none'}`;
}

export function groupCandidates(
  transactions: DetectionTransaction[]
): CandidateGroup[] {
  const groups = new Map<string, CandidateGroup>();

  for (const txn of transactions) {
    const subgroupKey = getDescriptionSubgroupKey(txn.merchant_name, txn.description);
    const key = [
      txn.merchant_group_id,
      txn.transaction_type,
      paymentSourceKey(txn),
      subgroupKey,
    ].join('|');

    if (!groups.has(key)) {
      groups.set(key, {
        merchantGroupId: txn.merchant_group_id,
        merchantName: txn.merchant_name,
        transactionType: txn.transaction_type,
        accountId: txn.account_id,
        creditCardId: txn.credit_card_id,
        subgroupKey,
        transactions: [],
      });
    }

    groups.get(key)!.transactions.push(txn);
  }

  return Array.from(groups.values()).filter((group) => group.transactions.length >= 1);
}
