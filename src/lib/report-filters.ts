import type { Category, TransactionWithSplits } from "./types";

/** Match the merchant list's system-category filter before aggregating groups. */
export function merchantReportTransactionIds(
  transactions: Pick<TransactionWithSplits, "id" | "splits">[],
  categories: Pick<Category, "id" | "is_system">[],
  includeSystemCategories: boolean,
) {
  const systemIds = new Set(categories.filter(c => c.is_system).map(c => c.id));
  return transactions
    .filter(t => includeSystemCategories || !t.splits.some(s => systemIds.has(s.category_id)))
    .map(t => t.id);
}
