import type { TransactionWithSplits } from './types';

export interface TransactionListFilters {
  categoryIds: number[];
  accountIds: number[];
  creditCardIds: number[];
  transactionTypes: Array<'income' | 'expense'>;
  merchantGroupIds: number[];
  tagIds: number[];
  startDate: string | null;
  endDate: string | null;
}

/** Whether a transaction still belongs in the current transactions-page result set. */
export function transactionMatchesListFilters(
  transaction: TransactionWithSplits,
  filters: TransactionListFilters,
): boolean {
  if (filters.startDate && transaction.date < filters.startDate) return false;
  if (filters.endDate && transaction.date > filters.endDate) return false;

  if (filters.categoryIds.length > 0) {
    const categoryIds = new Set(transaction.splits.map((split) => split.category_id));
    if (!filters.categoryIds.some((id) => categoryIds.has(id))) return false;
  }

  if (filters.accountIds.length > 0 || filters.creditCardIds.length > 0) {
    const matchesAccount = transaction.account_id != null && filters.accountIds.includes(transaction.account_id);
    const matchesCard = transaction.credit_card_id != null && filters.creditCardIds.includes(transaction.credit_card_id);
    if (!matchesAccount && !matchesCard) return false;
  }

  if (filters.transactionTypes.length > 0 && !filters.transactionTypes.includes(transaction.transaction_type)) {
    return false;
  }

  if (
    filters.merchantGroupIds.length > 0 &&
    (transaction.merchant_group_id == null || !filters.merchantGroupIds.includes(transaction.merchant_group_id))
  ) {
    return false;
  }

  if (filters.tagIds.length > 0) {
    const tagIds = new Set((transaction.tags ?? []).map((tag) => tag.id));
    if (!filters.tagIds.every((id) => tagIds.has(id))) return false;
  }

  return true;
}
