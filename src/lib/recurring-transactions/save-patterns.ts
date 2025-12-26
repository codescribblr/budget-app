import { createClient } from '../supabase/server';
import type { RecurringPattern } from './detection';

/**
 * Save detected patterns to the database
 * Checks for duplicates before saving
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

  for (const pattern of patterns) {
    try {
      // Check if a similar ACTIVE recurring transaction already exists
      // Only skip if there's an active one - deactivated patterns don't prevent re-detection
      // Look for same merchant_group_id and similar frequency
      const { data: existing } = await supabase
        .from('recurring_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('budget_account_id', budgetAccountId)
        .eq('merchant_group_id', pattern.merchantGroupId)
        .eq('frequency', pattern.frequency)
        .eq('transaction_type', pattern.transactionType)
        .eq('is_active', true) // Only check active patterns
        .single();

      if (existing) {
        // Already exists and is active, skip
        skipped++;
        continue;
      }

      // Calculate day_of_month and day_of_week from the pattern if needed
      let dayOfMonth: number | null = null;
      let dayOfWeek: number | null = null;
      let weekOfMonth: number | null = null;

      if (pattern.frequency === 'monthly' && pattern.lastOccurrenceDate) {
        const date = new Date(pattern.lastOccurrenceDate);
        dayOfMonth = date.getDate();
      } else if (pattern.frequency === 'weekly' && pattern.lastOccurrenceDate) {
        const date = new Date(pattern.lastOccurrenceDate);
        dayOfWeek = date.getDay();
      }

      // Save the pattern
      const { data: recurringTransaction, error } = await supabase
        .from('recurring_transactions')
        .insert({
          user_id: userId,
          budget_account_id: budgetAccountId,
          merchant_group_id: pattern.merchantGroupId,
          merchant_name: pattern.merchantName,
          frequency: pattern.frequency,
          interval: 1,
          day_of_month: dayOfMonth,
          day_of_week: dayOfWeek,
          week_of_month: weekOfMonth,
          expected_amount: Math.abs(pattern.expectedAmount), // Ensure always positive
          amount_variance: Math.abs(pattern.amountVariance), // Ensure always positive
          is_amount_variable: pattern.amountVariance > pattern.expectedAmount * 0.1, // Variable if variance > 10%
          transaction_type: pattern.transactionType,
          category_id: pattern.categoryId,
          account_id: pattern.accountId,
          credit_card_id: pattern.creditCardId,
          detection_method: 'automatic',
          confidence_score: pattern.confidenceScore,
          last_occurrence_date: pattern.lastOccurrenceDate,
          next_expected_date: pattern.nextExpectedDate,
          occurrence_count: pattern.occurrenceCount,
          is_active: true,
          is_confirmed: false, // User needs to confirm
          reminder_enabled: true,
          reminder_days_before: 2,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving pattern:', error);
        errors++;
      } else {
        // Save the transaction matches
        if (pattern.transactionIds && Array.isArray(pattern.transactionIds) && pattern.transactionIds.length > 0) {
          // Validate transaction IDs are numbers
          const validTransactionIds = pattern.transactionIds.filter(id => typeof id === 'number' && !isNaN(id));
          
          if (validTransactionIds.length > 0) {
            const matches = validTransactionIds.map(transactionId => ({
              recurring_transaction_id: recurringTransaction.id,
              transaction_id: transactionId,
              match_confidence: pattern.confidenceScore,
            }));

            const { error: matchError } = await supabase
              .from('recurring_transaction_matches')
              .insert(matches);

            if (matchError) {
              console.error('Error saving transaction matches:', matchError);
              // Don't fail the whole operation if matches fail
            }
          }
        }
        saved++;
      }
    } catch (error) {
      console.error('Error processing pattern:', error);
      errors++;
    }
  }

  return { saved, skipped, errors };
}



