import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildEnvelopeGoalBreakdown,
  envelopeGoalProgressAmount,
  type EnvelopeGoalBreakdown,
  type EnvelopeGoalTransactionRow,
} from '@/lib/goals/calculations';

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

export async function getEnvelopeGoalBreakdown(
  supabase: SupabaseClient,
  categoryId: number | null | undefined,
  envelopeBalance: number,
  budgetAccountId?: number
): Promise<EnvelopeGoalBreakdown> {
  if (!categoryId) {
    return buildEnvelopeGoalBreakdown(envelopeBalance, []);
  }

  const transactions: EnvelopeGoalTransactionRow[] = [];
  let from = 0;
  while (true) {
    let query = supabase
      .from('transaction_splits')
      .select('amount, transaction_id, transactions!inner(id, date, description, transaction_type, budget_account_id)')
      .eq('category_id', categoryId);

    if (budgetAccountId) {
      query = query.eq('transactions.budget_account_id', budgetAccountId);
    }

    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    const rows = data || [];
    for (const row of rows) {
      const related = row.transactions as
        | { id?: number; date?: string; description?: string; transaction_type?: string }
        | { id?: number; date?: string; description?: string; transaction_type?: string }[]
        | null;
      const tx = Array.isArray(related) ? related[0] : related;
      transactions.push({
        date: tx?.date || null,
        description: tx?.description || 'Transaction',
        amount: Number(row.amount) || 0,
        transaction_id: Number(tx?.id || row.transaction_id),
        transaction_type: tx?.transaction_type || 'expense',
      });
    }

    if (rows.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return buildEnvelopeGoalBreakdown(envelopeBalance, transactions);
}
