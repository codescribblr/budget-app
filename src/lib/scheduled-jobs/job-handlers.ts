/**
 * Job handlers for scheduled jobs
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { NotificationService } from '@/lib/notifications/notification-service';
import { createRecurringTransactionNotification } from '@/lib/notifications/helpers';
import { getUsersNeedingTrialNotifications, createTrialEndingNotification } from '@/lib/notifications/subscription-helpers';
import { checkAndDisableExpiredSubscriptions } from '@/lib/subscription-access-control';

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
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const graceWindowDays = 3; // Conservative: 3 days grace period

    // Step 1: Check for missed recurrences (next_expected_date in the past)
    const graceDate = new Date();
    graceDate.setDate(graceDate.getDate() - graceWindowDays);
    const graceDateStr = graceDate.toISOString().split('T')[0];

    const { data: missedTransactions, error: missedError } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .not('next_expected_date', 'is', null)
      .lte('next_expected_date', graceDateStr);

    if (missedError) {
      console.error('Error fetching missed recurring transactions:', missedError);
    }

    let deactivated = 0;
    let missedNotificationsSent = 0;

    // Process missed recurrences
    if (missedTransactions && missedTransactions.length > 0) {
      for (const rt of missedTransactions) {
        try {
          // Check if a matching transaction exists within the expected window
          const expectedDate = new Date(rt.next_expected_date);
          const windowStart = new Date(expectedDate);
          windowStart.setDate(windowStart.getDate() - 3); // ±3 days for monthly
          const windowEnd = new Date(expectedDate);
          windowEnd.setDate(windowEnd.getDate() + 3);

          // Determine amount tolerance
          const expectedAmount = rt.expected_amount || 0;
          const amountTolerance = Math.max(5, expectedAmount * 0.05);

          // Check for matching transactions
          const { data: matchingTransactions } = await supabase
            .from('transactions')
            .select('id, date')
            .eq('budget_account_id', rt.budget_account_id)
            .eq('merchant_group_id', rt.merchant_group_id)
            .eq('transaction_type', rt.transaction_type)
            .gte('date', windowStart.toISOString().split('T')[0])
            .lte('date', windowEnd.toISOString().split('T')[0])
            .gte('total_amount', expectedAmount - amountTolerance)
            .lte('total_amount', expectedAmount + amountTolerance)
            .limit(1);

          if (matchingTransactions && matchingTransactions.length > 0) {
            // Transaction found - reset missed streak and update last_occurrence_date
            await supabase
              .from('recurring_transactions')
              .update({
                missed_streak: 0,
                last_missed_date: null,
                last_occurrence_date: matchingTransactions[0].date || rt.next_expected_date,
                occurrence_count: (rt.occurrence_count || 0) + 1,
              })
              .eq('id', rt.id);

            // Calculate and update next_expected_date
            const frequency = rt.frequency;
            const interval = rt.interval || 1;
            const nextDate = calculateNextExpectedDate(
              new Date(matchingTransactions[0].date || rt.next_expected_date),
              frequency,
              interval,
              rt.day_of_month,
              rt.day_of_week
            );

            await supabase
              .from('recurring_transactions')
              .update({ next_expected_date: nextDate.toISOString().split('T')[0] })
              .eq('id', rt.id);
          } else {
            // No matching transaction found - increment missed streak
            const currentStreak = rt.missed_streak || 0;
            const newStreak = currentStreak + 1;

            // Send missed notification only once per streak (on first miss)
            if (currentStreak === 0) {
              await createRecurringTransactionNotification(
                rt.user_id,
                rt.budget_account_id,
                rt.id,
                'missed',
                {
                  merchantName: rt.merchant_name,
                  expectedAmount: expectedAmount,
                  expectedDate: rt.next_expected_date,
                }
              );
              missedNotificationsSent++;
            }

            if (newStreak >= 2) {
              // Deactivate pattern after 2 consecutive misses
              await supabase
                .from('recurring_transactions')
                .update({
                  is_active: false,
                  missed_streak: newStreak,
                  last_missed_date: rt.next_expected_date,
                  status_reason: 'missed_twice',
                })
                .eq('id', rt.id);
              deactivated++;
            } else {
              // Update missed streak but keep active
              await supabase
                .from('recurring_transactions')
                .update({
                  missed_streak: newStreak,
                  last_missed_date: rt.next_expected_date,
                })
                .eq('id', rt.id);
            }
          }
        } catch (error: any) {
          console.error(`Error processing missed recurring transaction ${rt.id}:`, error);
        }
      }
    }

    // Step 2: Process upcoming recurring transactions (existing logic)
    const { data: recurringTransactions, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .eq('reminder_enabled', true)
      .not('next_expected_date', 'is', null)
      .gte('next_expected_date', todayStr)
      .lte('next_expected_date', nextWeek.toISOString().split('T')[0]);

    if (error) {
      console.error('Error fetching recurring transactions:', error);
      return { success: false, error: error.message };
    }

    let processed = 0;
    let notificationsCreated = 0;

    // Process each recurring transaction
    if (recurringTransactions && recurringTransactions.length > 0) {
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
          const interval = rt.interval || 1;
          const nextDate = calculateNextExpectedDate(
            new Date(rt.next_expected_date),
            frequency,
            interval,
            rt.day_of_month,
            rt.day_of_week
          );

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
    }

    const messages: string[] = [];
    if (processed > 0) messages.push(`Processed ${processed} upcoming transactions`);
    if (notificationsCreated > 0) messages.push(`Created ${notificationsCreated} notifications`);
    if (deactivated > 0) messages.push(`Deactivated ${deactivated} patterns`);
    if (missedNotificationsSent > 0) messages.push(`Sent ${missedNotificationsSent} missed notifications`);

    return {
      success: true,
      message: messages.length > 0 ? messages.join(', ') : 'No recurring transactions to process',
    };
  } catch (error: any) {
    console.error('Error in check recurring transactions job:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate next expected date based on frequency
 */
function calculateNextExpectedDate(
  lastDate: Date,
  frequency: string,
  interval: number,
  dayOfMonth: number | null,
  dayOfWeek: number | null
): Date {
  const next = new Date(lastDate);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + interval * 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + interval * 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      if (dayOfMonth !== null) {
        const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(dayOfMonth, lastDayOfMonth));
      }
      break;
    case 'bimonthly':
      next.setMonth(next.getMonth() + interval * 2);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + interval * 3);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval);
      break;
    default:
      // Custom frequency - use interval as days
      next.setDate(next.getDate() + interval);
      break;
  }

  return next;
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
 * Monthly funding rollover - resets monthly funding tracking for the new month
 * Scheduled for midnight UTC on the 1st, but executes when cron runs (currently 8 AM UTC daily)
 */
export async function handleMonthlyRollover(): Promise<JobResult> {
  try {
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
 * Handler for net_worth_snapshot job
 * Creates daily snapshots of net worth for all budget accounts
 * Runs daily to track net worth changes over time
 */
export async function handleNetWorthSnapshot(): Promise<JobResult> {
  try {
    const supabase = createServiceRoleClient();
    
    // Get all active budget accounts
    const { data: budgetAccounts, error: accountsError } = await supabase
      .from('budget_accounts')
      .select('id')
      .is('deleted_at', null);
    
    if (accountsError) {
      console.error('Error fetching budget accounts:', accountsError);
      return { success: false, error: accountsError.message };
    }
    
    if (!budgetAccounts || budgetAccounts.length === 0) {
      return { success: true, message: 'No budget accounts to process' };
    }
    
    let processed = 0;
    let errors = 0;
    const today = new Date().toISOString().split('T')[0];
    
    // Process each budget account
    for (const account of budgetAccounts) {
      try {
        // Get all accounts (only those included in totals)
        const { data: accounts } = await supabase
          .from('accounts')
          .select('balance, include_in_totals')
          .eq('account_id', account.id);
        
        // Get all credit cards (all credit cards are liabilities for net worth)
        const { data: creditCards } = await supabase
          .from('credit_cards')
          .select('current_balance')
          .eq('account_id', account.id);
        
        // Get all loans (only those included in net worth)
        const { data: loans } = await supabase
          .from('loans')
          .select('balance, include_in_net_worth')
          .eq('account_id', account.id);
        
        // Get all assets
        const { data: assets } = await supabase
          .from('non_cash_assets')
          .select('current_value')
          .eq('account_id', account.id);
        
        // Calculate totals
        const totalAccounts = (accounts || [])
          .filter(acc => acc.include_in_totals === true)
          .reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
        
        const totalCreditCards = (creditCards || [])
          .reduce((sum, cc) => sum + Number(cc.current_balance || 0), 0);
        
        const totalLoans = (loans || [])
          .filter(loan => loan.include_in_net_worth === true)
          .reduce((sum, loan) => sum + Number(loan.balance || 0), 0);
        
        const totalAssets = (assets || [])
          .reduce((sum, asset) => sum + Number(asset.current_value || 0), 0);
        
        // Net worth = accounts + assets - credit cards - loans
        const netWorth = totalAccounts + totalAssets - totalCreditCards - totalLoans;
        
        // Upsert snapshot for today
        const { error: snapshotError } = await supabase
          .from('net_worth_snapshots')
          .upsert({
            budget_account_id: account.id,
            snapshot_date: today,
            total_accounts: totalAccounts,
            total_credit_cards: totalCreditCards,
            total_loans: totalLoans,
            total_assets: totalAssets,
            net_worth: netWorth,
          }, {
            onConflict: 'budget_account_id,snapshot_date'
          });
        
        if (snapshotError) {
          console.error(`Error creating snapshot for account ${account.id}:`, snapshotError);
          errors++;
        } else {
          processed++;
        }
      } catch (error: any) {
        console.error(`Error processing account ${account.id}:`, error);
        errors++;
      }
    }
    
    return {
      success: errors === 0,
      message: `Created net worth snapshots for ${processed} accounts${errors > 0 ? `, ${errors} errors` : ''}`,
    };
  } catch (error: any) {
    console.error('Error in net worth snapshot job:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handler for check_trial_periods job
 * Checks all trialing subscriptions and sends notifications for trials ending soon
 * Also disables premium access for expired trials
 */
export async function handleCheckTrialPeriods(): Promise<JobResult> {
  try {
    // Step 1: Send trial ending notifications
    const usersNeedingNotifications = await getUsersNeedingTrialNotifications();
    
    let notificationsSent = 0;
    let notificationErrors = 0;

    for (const user of usersNeedingNotifications) {
      try {
        await createTrialEndingNotification(
          user.userId,
          user.accountId,
          user.daysRemaining,
          user.trialEnd
        );
        notificationsSent++;
      } catch (error: any) {
        console.error(`Error sending trial notification for user ${user.userId}:`, error);
        notificationErrors++;
      }
    }

    // Step 2: Disable premium access for expired subscriptions
    const { disabled, errors } = await checkAndDisableExpiredSubscriptions();

    const messages: string[] = [];
    if (notificationsSent > 0) messages.push(`Sent ${notificationsSent} trial ending notifications`);
    if (notificationErrors > 0) messages.push(`${notificationErrors} notification errors`);
    if (disabled > 0) messages.push(`Disabled premium access for ${disabled} accounts`);
    if (errors > 0) messages.push(`${errors} disable errors`);

    return {
      success: notificationErrors === 0 && errors === 0,
      message: messages.length > 0 ? messages.join(', ') : 'No trial notifications needed',
    };
  } catch (error: any) {
    console.error('Error in check trial periods job:', error);
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
    case 'net_worth_snapshot':
      return handleNetWorthSnapshot;
    case 'check_trial_periods':
      return handleCheckTrialPeriods;
    default:
      return null;
  }
}


