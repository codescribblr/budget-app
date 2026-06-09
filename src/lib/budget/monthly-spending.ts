import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Compute spending per category for a calendar month.
 * Expenses add to spending; income subtracts (refunds, etc.).
 */
export async function computeMonthlySpendingByCategory(
  supabase: SupabaseClient,
  budgetAccountId: number,
  year: number,
  monthIndex0: number
): Promise<Record<number, number>> {
  const month = String(monthIndex0 + 1).padStart(2, '0');
  const startDate = `${year}-${month}-01`;
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      transaction_type,
      splits:transaction_splits(
        category_id,
        amount
      )
    `)
    .eq('budget_account_id', budgetAccountId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    throw error;
  }

  const spendingByCategory: Record<number, number> = {};

  transactions?.forEach((transaction: any) => {
    const transactionType = transaction.transaction_type || 'expense';
    transaction.splits?.forEach((split: any) => {
      const categoryId = split.category_id;
      const amount = Number(split.amount);

      if (!spendingByCategory[categoryId]) {
        spendingByCategory[categoryId] = 0;
      }

      if (transactionType === 'expense') {
        spendingByCategory[categoryId] += amount;
      } else if (transactionType === 'income') {
        spendingByCategory[categoryId] -= amount;
      }
    });
  });

  return spendingByCategory;
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
