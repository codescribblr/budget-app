/**
 * Job handlers for scheduled jobs
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { NotificationService } from '@/lib/notifications/notification-service';
import { createRecurringTransactionNotification } from '@/lib/notifications/helpers';

const notificationService = new NotificationService();

export interface JobResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Handler for check_recurring_transactions job
 */
export async function handleCheckRecurringTransactions(): Promise<JobResult> {
  try {
    const supabase = createServiceRoleClient();

    // Get all active recurring transactions with next_expected_date within next 7 days
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const { data: recurringTransactions, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .eq('reminder_enabled', true)
      .not('next_expected_date', 'is', null)
      .gte('next_expected_date', today.toISOString().split('T')[0])
      .lte('next_expected_date', nextWeek.toISOString().split('T')[0]);

    if (error) {
      console.error('Error fetching recurring transactions:', error);
      return { success: false, error: error.message };
    }

    if (!recurringTransactions || recurringTransactions.length === 0) {
      return { success: true, message: 'No recurring transactions to process' };
    }

    let processed = 0;
    let notificationsCreated = 0;

    // Process each recurring transaction
    for (const rt of recurringTransactions) {
      try {
        // Get user preferences for reminder_days_before
        const preferences = await notificationService.getUserPreferences(
          rt.user_id,
          'recurring_transaction_upcoming'
        );

        const reminderDays = preferences.settings?.reminder_days_before || 2;
        const dueDate = new Date(rt.next_expected_date);
        const daysUntilDue = Math.ceil(
          (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check if we should send a notification
        if (daysUntilDue === reminderDays) {
          // Get account balance for insufficient funds check
          const { data: account } = await supabase
            .from('accounts')
            .select('balance')
            .eq('budget_account_id', rt.budget_account_id)
            .limit(1)
            .single();

          const currentBalance = account?.balance || 0;
          const expectedAmount = rt.expected_amount || 0;
          const hasSufficientFunds = currentBalance >= expectedAmount;

          // Send upcoming notification
          await createRecurringTransactionNotification(
            rt.user_id,
            rt.budget_account_id,
            rt.id,
            'upcoming',
            {
              merchantName: rt.merchant_name,
              expectedAmount: expectedAmount,
              dueDate: rt.next_expected_date,
              daysUntilDue,
            }
          );
          notificationsCreated++;

          // Send insufficient funds notification if needed
          if (!hasSufficientFunds) {
            const shortfall = expectedAmount - currentBalance;
            await createRecurringTransactionNotification(
              rt.user_id,
              rt.budget_account_id,
              rt.id,
              'insufficient_funds',
              {
                merchantName: rt.merchant_name,
                expectedAmount: expectedAmount,
                currentBalance,
                shortfall: shortfall ?? undefined,
              }
            );
            notificationsCreated++;
          }
        }

        // Update next_expected_date (calculate next occurrence)
        const frequency = rt.frequency;
        const interval = rt.frequency_interval || 1;
        const nextDate = new Date(rt.next_expected_date);

        switch (frequency) {
          case 'daily':
            nextDate.setDate(nextDate.getDate() + interval);
            break;
          case 'weekly':
            nextDate.setDate(nextDate.getDate() + interval * 7);
            break;
          case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + interval);
            break;
          case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + interval);
            break;
        }

        await supabase
          .from('recurring_transactions')
          .update({ next_expected_date: nextDate.toISOString().split('T')[0] })
          .eq('id', rt.id);

        processed++;
      } catch (error: any) {
        console.error(`Error processing recurring transaction ${rt.id}:`, error);
        // Continue processing other transactions
      }
    }

    return {
      success: true,
      message: `Processed ${processed} recurring transactions, created ${notificationsCreated} notifications`,
    };
  } catch (error: any) {
    console.error('Error in check recurring transactions job:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handler for send_notifications job
 */
export async function handleSendNotifications(): Promise<JobResult> {
  try {
    await notificationService.sendScheduledNotifications();
    return { success: true, message: 'Scheduled notifications processed' };
  } catch (error: any) {
    console.error('Error in send notifications job:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handler for monthly_rollover job
 */
export async function handleMonthlyRollover(): Promise<JobResult> {
  try {
    const supabase = createServiceRoleClient();

    // Monthly funding rollover job
    // Resets monthly funding tracking for the new month
    // This job doesn't need to do anything currently
    // Monthly funding records are created on-demand when allocations are made
    // Old records are kept for historical tracking
    
    // In the future, we could:
    // - Archive old funding records
    // - Send notifications about underfunded categories
    // - Generate monthly reports
    
    console.log('Monthly funding rollover completed');
    return { success: true, message: 'Monthly rollover completed' };
  } catch (error: any) {
    console.error('Error in monthly rollover job:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get handler function for a job type
 */
export function getJobHandler(jobType: string): (() => Promise<JobResult>) | null {
  switch (jobType) {
    case 'check_recurring_transactions':
      return handleCheckRecurringTransactions;
    case 'send_notifications':
      return handleSendNotifications;
    case 'monthly_rollover':
      return handleMonthlyRollover;
    default:
      return null;
  }
}

