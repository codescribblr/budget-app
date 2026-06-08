/**
 * Testable adapter for the V2 detection pipeline.
 * Maps legacy test transaction shapes to DetectionTransaction and delegates to detect-from-data.
 */

import {
  detectRecurringTransactionsFromData as detectFromData,
  type RecurringPattern,
} from './detect-from-data';
import type { DetectionTransaction } from './types';

export type { RecurringPattern };

type TestTransaction = {
  id: number;
  date: string;
  total_amount: number;
  transaction_type: 'income' | 'expense';
  merchant_group_id: number | null;
  account_id: number | null;
  credit_card_id: number | null;
  description?: string;
  merchant_groups?: {
    display_name: string;
  };
  transaction_splits?: Array<{
    category_id: number | null;
    amount?: number;
    categories?: {
      is_system: boolean;
      is_buffer: boolean;
      name?: string;
    };
  }>;
};

function mapTestTransaction(txn: TestTransaction): DetectionTransaction | null {
  if (!txn.merchant_group_id) return null;

  const splits = (txn.transaction_splits || [])
    .filter((split): split is typeof split & { category_id: number } => split.category_id != null)
    .map((split) => ({
      category_id: split.category_id,
      amount: split.amount ?? Math.abs(txn.total_amount),
      category_name: split.categories?.name || '',
      is_system: Boolean(split.categories?.is_system),
      is_buffer: Boolean(split.categories?.is_buffer),
    }));

  return {
    id: txn.id,
    date: txn.date,
    description: txn.description || '',
    total_amount: Math.abs(txn.total_amount),
    transaction_type: txn.transaction_type,
    merchant_group_id: txn.merchant_group_id,
    merchant_name: txn.merchant_groups?.display_name || 'Unknown',
    account_id: txn.account_id ?? null,
    credit_card_id: txn.credit_card_id ?? null,
    splits,
  };
}

export async function detectRecurringTransactionsFromData(
  transactions: TestTransaction[],
  lookbackMonths: number = 12
): Promise<RecurringPattern[]> {
  const mapped = transactions
    .map(mapTestTransaction)
    .filter((txn): txn is DetectionTransaction => txn !== null);

  return detectFromData(mapped, { lookbackMonths });
}
