import { createClient } from '../supabase/server';
import type { RecurringPattern } from './types';
import { amountBucket } from './utils/stats';

/**
 * Save detected patterns to the database.
 * Respects dismissed user feedback and avoids duplicate active patterns.
 */
export async function saveDetectedPatterns(
  userId: string,
  budgetAccountId: number,
  patterns: RecurringPattern[]
): Promise<{ saved: number; skipped: number; errors: number }> {
  const supabase = await createClient();

  let saved = 0;
  let skipped = 0;
  let errors = 0;

  const { data: dismissedFeedback } = await supabase
    .from('recurring_user_feedback')
    .select('merchant_group_id, amount_bucket, frequency')
    .eq('user_id', userId)
    .eq('budget_account_id', budgetAccountId)
    .eq('feedback_type', 'dismissed');

  const dismissedKeys = new Set(
    (dismissedFeedback || []).map((row) =>
      [
        row.merchant_group_id,
        row.frequency,
        row.amount_bucket ?? 'variable',
      ].join('|')
    )
  );

  for (const pattern of patterns) {
    try {
      const bucket = pattern.isAmountVariable
        ? 'variable'
        : amountBucket(pattern.expectedAmount);
      const dismissKey = [
        pattern.merchantGroupId,
        pattern.frequency,
        pattern.isAmountVariable ? 'variable' : bucket,
      ].join('|');

      if (dismissedKeys.has(dismissKey)) {
        skipped++;
        continue;
      }

      const { data: existing } = await supabase
        .from('recurring_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('budget_account_id', budgetAccountId)
        .eq('merchant_group_id', pattern.merchantGroupId)
        .eq('frequency', pattern.frequency)
        .eq('transaction_type', pattern.transactionType)
        .in('tracking_status', ['suggested', 'confirmed', 'paused'])
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { data: recurringTransaction, error } = await supabase
        .from('recurring_transactions')
        .insert({
          user_id: userId,
          budget_account_id: budgetAccountId,
          merchant_group_id: pattern.merchantGroupId,
          merchant_name: pattern.merchantName,
          description_pattern: pattern.descriptionPattern,
          frequency: pattern.frequency === 'unknown' ? 'custom' : pattern.frequency,
          interval: 1,
          day_of_month: pattern.dayOfMonth,
          day_of_week: pattern.dayOfWeek,
          expected_amount: Math.abs(pattern.expectedAmount),
          amount_variance: Math.abs(pattern.amountVariance),
          is_amount_variable: pattern.isAmountVariable,
          transaction_type: pattern.transactionType,
          category_id: pattern.categoryId,
          account_id: pattern.accountId,
          credit_card_id: pattern.creditCardId,
          detection_method: 'automatic',
          confidence_score: pattern.confidenceScore,
          involuntary_score: pattern.involuntaryScore,
          evidence_score: pattern.evidenceScore,
          charge_class: pattern.chargeClass,
          detection_path: pattern.detectionPath,
          classification_signals: pattern.classificationSignals,
          date_anchor_type: pattern.dateAnchorType,
          last_occurrence_date: pattern.lastOccurrenceDate,
          next_expected_date: pattern.nextExpectedDate,
          occurrence_count: pattern.occurrenceCount,
          tracking_status: 'suggested',
          is_active: true,
          is_confirmed: false,
          reminder_enabled: true,
          reminder_days_before: 2,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving pattern:', error);
        errors++;
        continue;
      }

      if (pattern.transactionIds.length > 0) {
        const matches = pattern.transactionIds.map((transactionId) => ({
          recurring_transaction_id: recurringTransaction.id,
          transaction_id: transactionId,
          match_confidence: pattern.confidenceScore,
        }));

        const { error: matchError } = await supabase
          .from('recurring_transaction_matches')
          .insert(matches);

        if (matchError) {
          console.error('Error saving transaction matches:', matchError);
        }
      }

      saved++;
    } catch (error) {
      console.error('Error processing pattern:', error);
      errors++;
    }
  }

  return { saved, skipped, errors };
}

