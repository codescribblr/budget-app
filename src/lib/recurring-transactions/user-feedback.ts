import type { SupabaseClient } from '@supabase/supabase-js';
import { amountBucket } from './utils/stats';

interface RecurringRow {
  merchant_group_id: number | null;
  frequency: string;
  expected_amount: number | null;
  is_amount_variable?: boolean | null;
  charge_class?: string | null;
}

export async function recordRecurringFeedback(
  supabase: SupabaseClient,
  userId: string,
  budgetAccountId: number,
  recurring: RecurringRow,
  feedbackType: 'confirmed' | 'dismissed'
): Promise<void> {
  if (!recurring.merchant_group_id) return;

  const bucket = recurring.is_amount_variable
    ? null
    : amountBucket(Math.abs(recurring.expected_amount || 0));

  const { error } = await supabase.from('recurring_user_feedback').upsert(
    {
      user_id: userId,
      budget_account_id: budgetAccountId,
      merchant_group_id: recurring.merchant_group_id,
      amount_bucket: bucket,
      frequency: recurring.frequency,
      feedback_type: feedbackType,
      charge_class: recurring.charge_class,
    },
    {
      onConflict: 'user_id,budget_account_id,merchant_group_id,amount_bucket,frequency,feedback_type',
    }
  );

  if (error) {
    console.warn('[RecurringFeedback] Failed to record feedback:', error.message);
  }
}
