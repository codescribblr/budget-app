import type { SupabaseClient } from '@supabase/supabase-js';
import { envelopeGoalProgressAmount } from '@/lib/goals/calculations';

const PAGE_SIZE = 1000;

/**
 * Net spending still assigned to the given categories.
 * Expenses add; income (refunds) subtracts. Transfers are not transactions
 * and are not included.
 */
export async function sumCategorizedSpendingByCategory(
  supabase: SupabaseClient,
  categoryIds: number[],
  budgetAccountId?: number
): Promise<Record<number, number>> {
  const totals: Record<number, number> = {};
  for (const id of categoryIds) {
    totals[id] = 0;
  }
  if (categoryIds.length === 0) {
    return totals;
  }

  let from = 0;
  while (true) {
    let query = supabase
      .from('transaction_splits')
      .select('category_id, amount, transactions!inner(transaction_type, budget_account_id)')
      .in('category_id', categoryIds);

    if (budgetAccountId) {
      query = query.eq('transactions.budget_account_id', budgetAccountId);
    }

    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const rows = data || [];
    for (const row of rows) {
      const categoryId = Number(row.category_id);
      const amount = Number(row.amount) || 0;
      const related = row.transactions as { transaction_type?: string } | { transaction_type?: string }[] | null;
      const transactionType = Array.isArray(related)
        ? related[0]?.transaction_type
        : related?.transaction_type;
      const type = transactionType || 'expense';

      if (!totals[categoryId]) {
        totals[categoryId] = 0;
      }

      if (type === 'expense') {
        totals[categoryId] += amount;
      } else if (type === 'income') {
        totals[categoryId] -= amount;
      }
    }

    if (rows.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return totals;
}

export function applyEnvelopeGoalProgress(
  envelopeBalance: number,
  spendingByCategory: Record<number, number>,
  categoryId: number | null | undefined
): number {
  if (!categoryId) {
    return envelopeGoalProgressAmount(envelopeBalance, 0);
  }
  return envelopeGoalProgressAmount(envelopeBalance, spendingByCategory[categoryId] || 0);
}
