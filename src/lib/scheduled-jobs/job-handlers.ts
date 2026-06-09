/**
 * Job handlers for scheduled jobs
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { cleanupApiKeyUsageLogs } from '@/lib/external-api/auth';
import { cleanupIdempotencyRecords } from '@/lib/external-api/idempotency';
import { syncAllRentCastAssetsForAccount } from '@/lib/integrations/rentcast/sync';
import {
  EXTERNAL_API_IDEMPOTENCY_TTL_HOURS,
  EXTERNAL_API_USAGE_LOG_RETENTION_DAYS,
} from '@/lib/external-api/constants';
import { processRecurringNotifications } from '@/lib/recurring-transactions/recurring-notification-check';
import { NotificationService } from '@/lib/notifications/notification-service';
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
    const result = await processRecurringNotifications();

    const messages: string[] = [];
    if (result.remindersSent > 0) {
      messages.push(`Sent ${result.remindersSent} upcoming reminders`);
    }
    if (result.insufficientFundsSent > 0) {
      messages.push(`Sent ${result.insufficientFundsSent} insufficient funds alerts`);
    }
    if (result.amountChangedSent > 0) {
      messages.push(`Sent ${result.amountChangedSent} amount changed alerts`);
    }
    if (result.missedSent > 0) {
      messages.push(`Sent ${result.missedSent} missed payment alerts`);
    }
    if (result.occurrencesResolved > 0) {
      messages.push(`Resolved ${result.occurrencesResolved} occurrences`);
    }
    if (result.deactivated > 0) {
      messages.push(`Deactivated ${result.deactivated} patterns`);
    }

    return {
      success: true,
      message: messages.length > 0 ? messages.join(', ') : 'No recurring notifications to send',
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
 * Handler for suggest_merchant_groupings job
 * Loads ungrouped patterns, calls Gemini to suggest groupings, post-filters by rejections, persists suggestions.
 */
export async function handleSuggestMerchantGroupings(): Promise<JobResult> {
  try {
    const supabase = createServiceRoleClient();
    const { generateMerchantSuggestions, rejectionKey } = await import('@/lib/ai/merchant-suggestions');

    const LIMIT = 500;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString();

    const { data: ungrouped, error: patternsError } = await supabase
      .from('global_merchant_patterns')
      .select('id, pattern, normalized_pattern, usage_count')
      .is('global_merchant_id', null)
      .gte('last_seen_at', sixMonthsAgoStr)
      .order('usage_count', { ascending: false })
      .limit(LIMIT);

    if (patternsError) {
      console.error('Error fetching ungrouped patterns:', patternsError);
      return { success: false, error: patternsError.message };
    }
    if (!ungrouped || ungrouped.length === 0) {
      return { success: true, message: 'No ungrouped patterns to suggest' };
    }

    const { data: rejections } = await supabase
      .from('global_merchant_pattern_rejections')
      .select('pattern_id, rejected_global_merchant_id, rejected_suggested_display_name');

    const rejectionSet = new Set<string>();
    for (const r of rejections || []) {
      if (r.rejected_global_merchant_id != null) {
        rejectionSet.add(rejectionKey(r.pattern_id, r.rejected_global_merchant_id, null));
      }
      if (r.rejected_suggested_display_name) {
        rejectionSet.add(rejectionKey(r.pattern_id, null, r.rejected_suggested_display_name));
      }
    }

    const { data: merchants } = await supabase
      .from('global_merchants')
      .select('id, display_name')
      .in('status', ['active', 'draft']);

    const { suggestions } = await generateMerchantSuggestions(
      ungrouped,
      merchants || [],
      rejectionSet
    );

    if (suggestions.length === 0) {
      return { success: true, message: 'No new suggestions after filtering' };
    }

    const batchId = `suggest_${new Date().toISOString().slice(0, 10)}`;
    let created = 0;
    for (const s of suggestions) {
      const validMerchantId = s.suggested_merchant_id != null && (merchants || []).some(m => m.id === s.suggested_merchant_id)
        ? s.suggested_merchant_id
        : null;
      const validName = (s.suggested_display_name || '').trim() || null;
      if (validMerchantId === null && validName === null) continue;

      const { data: row, error: insertError } = await supabase
        .from('global_merchant_suggestions')
        .insert({
          suggested_global_merchant_id: validMerchantId,
          suggested_display_name: validName,
          status: 'pending',
          batch_id: batchId,
          metadata: {},
        })
        .select('id')
        .single();

      if (insertError || !row) {
        console.error('Error inserting suggestion:', insertError);
        continue;
      }
      for (const pid of s.pattern_ids) {
        await supabase.from('global_merchant_suggestion_patterns').insert({
          suggestion_id: row.id,
          pattern_id: pid,
        });
      }
      created++;
    }

    return {
      success: true,
      message: `Created ${created} suggestion(s) in batch ${batchId}`,
    };
  } catch (error: any) {
    console.error('Error in suggest_merchant_groupings job:', error);
    return { success: false, error: error.message || 'Job failed' };
  }
}

/**
 * Handler for cleanup_api_key_logs job
 * Deletes usage logs older than 90 days and stale idempotency records
 */
export async function handleCleanupApiKeyLogs(): Promise<JobResult> {
  try {
    const usageDeleted = await cleanupApiKeyUsageLogs(EXTERNAL_API_USAGE_LOG_RETENTION_DAYS);
    const idempotencyDeleted = await cleanupIdempotencyRecords(EXTERNAL_API_IDEMPOTENCY_TTL_HOURS);

    return {
      success: true,
      message: `Deleted ${usageDeleted} usage log(s) and ${idempotencyDeleted} idempotency record(s)`,
    };
  } catch (error: any) {
    console.error('Error in cleanup_api_key_logs job:', error);
    return { success: false, error: error.message || 'Job failed' };
  }
}

/**
 * Handler for rentcast_sync job
 * Syncs RentCast valuations for all enabled real estate assets
 */
export async function handleRentCastSync(): Promise<JobResult> {
  try {
    const supabase = createServiceRoleClient();

    const { data: integrations, error } = await supabase
      .from('integration_settings')
      .select('account_id')
      .eq('integration_type', 'rentcast')
      .eq('is_enabled', true)
      .not('encrypted_api_key', 'is', null);

    if (error) {
      console.error('Error fetching RentCast integrations:', error);
      return { success: false, error: error.message };
    }

    if (!integrations || integrations.length === 0) {
      return { success: true, message: 'No active RentCast integrations to sync' };
    }

    let totalSynced = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (const integration of integrations) {
      const result = await syncAllRentCastAssetsForAccount(supabase, integration.account_id);
      totalSynced += result.synced;
      totalSkipped += result.skipped;
      totalFailed += result.failed;
    }

    return {
      success: true,
      message: `RentCast sync completed: ${totalSynced} synced, ${totalSkipped} skipped, ${totalFailed} failed`,
    };
  } catch (error: any) {
    console.error('Error in rentcast_sync job:', error);
    return { success: false, error: error.message || 'Job failed' };
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
    case 'suggest_merchant_groupings':
      return handleSuggestMerchantGroupings;
    case 'cleanup_api_key_logs':
      return handleCleanupApiKeyLogs;
    case 'rentcast_sync':
      return handleRentCastSync;
    default:
      return null;
  }
}


