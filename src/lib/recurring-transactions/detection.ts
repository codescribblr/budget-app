import { createClient } from '../supabase/server';
import {
  detectRecurringTransactionsFromData,
  type RecurringPattern,
  type UserFeedbackRecord,
} from './detect-from-data';
import type { DetectionTransaction } from './types';

export type { RecurringPattern } from './types';

function mapTransaction(row: any): DetectionTransaction | null {
  if (!row.merchant_group_id) return null;

  const splits = (row.transaction_splits || []).map((split: any) => ({
    category_id: split.category_id,
    amount: split.amount,
    category_name: split.categories?.name || '',
    is_system: Boolean(split.categories?.is_system),
    is_buffer: Boolean(split.categories?.is_buffer),
  }));

  return {
    id: row.id,
    date: row.date,
    description: row.description || '',
    total_amount: Math.abs(row.total_amount),
    transaction_type: row.transaction_type,
    merchant_group_id: row.merchant_group_id,
    merchant_name: row.merchant_groups?.display_name || 'Unknown',
    account_id: row.account_id ?? null,
    credit_card_id: row.credit_card_id ?? null,
    splits,
  };
}

async function loadUserFeedback(
  userId: string,
  budgetAccountId: number
): Promise<UserFeedbackRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('recurring_user_feedback')
    .select('merchant_group_id, amount_bucket, frequency, feedback_type')
    .eq('user_id', userId)
    .eq('budget_account_id', budgetAccountId);

  if (error) {
    console.warn('[Detection] Could not load user feedback:', error.message);
    return [];
  }

  return (data || []) as UserFeedbackRecord[];
}

/**
 * Detect recurring transaction patterns from historical transactions.
 * Uses the V2 pipeline with classification, occurrence scoring, and user feedback.
 */
export async function detectRecurringTransactions(
  userId: string,
  budgetAccountId: number,
  lookbackMonths: number = 15
): Promise<RecurringPattern[]> {
  const supabase = await createClient();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - lookbackMonths);

  let allTransactions: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        date,
        description,
        total_amount,
        transaction_type,
        merchant_group_id,
        account_id,
        credit_card_id,
        merchant_groups (
          display_name
        ),
        transaction_splits (
          category_id,
          amount,
          categories (
            name,
            is_system,
            is_buffer
          )
        )
      `)
      .eq('user_id', userId)
      .eq('budget_account_id', budgetAccountId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!transactions || transactions.length === 0) {
      hasMore = false;
      break;
    }

    allTransactions = allTransactions.concat(transactions);
    hasMore = transactions.length === pageSize;
    from += pageSize;
  }

  const mapped = allTransactions
    .map(mapTransaction)
    .filter((txn): txn is DetectionTransaction => txn !== null);

  const userFeedback = await loadUserFeedback(userId, budgetAccountId);

  return detectRecurringTransactionsFromData(mapped, {
    userFeedback,
    lookbackMonths,
  });
}
