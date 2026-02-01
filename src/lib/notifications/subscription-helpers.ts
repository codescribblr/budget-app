import { NotificationService } from './notification-service';
import { createServiceRoleClient } from '../supabase/server';

const service = new NotificationService();

/**
 * Create subscription trial ending notification
 */
export async function createTrialEndingNotification(
  userId: string,
  accountId: number,
  daysRemaining: number,
  trialEndDate: string
): Promise<number> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const actionUrl = `${baseUrl}/settings/subscription`;

  let title: string;
  let message: string;
  
  if (daysRemaining === 7) {
    title = 'Your Premium trial ends in 7 days';
    message = `Your 60-day Premium trial will end on ${new Date(trialEndDate).toLocaleDateString()}. You'll be billed $100/year unless you cancel before then.`;
  } else if (daysRemaining === 3) {
    title = 'Your Premium trial ends in 3 days';
    message = `Your Premium trial ends on ${new Date(trialEndDate).toLocaleDateString()}. You'll be charged $100/year unless you cancel.`;
  } else if (daysRemaining === 1) {
    title = 'Last day of your Premium trial';
    message = `Tomorrow (${new Date(trialEndDate).toLocaleDateString()}), you'll be charged $100/year for Premium. Cancel now if you don't want to continue.`;
  } else {
    title = `Your Premium trial ends in ${daysRemaining} days`;
    message = `Your Premium trial ends on ${new Date(trialEndDate).toLocaleDateString()}. You'll be billed $100/year unless you cancel.`;
  }

  return service.createNotification({
    userId,
    budgetAccountId: accountId,
    notificationTypeId: 'subscription_trial_ending',
    title,
    message,
    actionUrl,
    actionLabel: 'Manage Subscription',
    metadata: {
      days_remaining: daysRemaining,
      trial_end_date: trialEndDate,
      billing_amount: 100,
      billing_period: 'year',
    },
  });
}

/**
 * Create subscription payment failed notification
 */
export async function createPaymentFailedNotification(
  userId: string,
  accountId: number,
  subscriptionId: string,
  nextRetryDate?: string
): Promise<number> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const actionUrl = `${baseUrl}/settings/subscription`;

  const title = 'Payment Failed - Action Required';
  const message = nextRetryDate
    ? `Your Premium subscription payment failed. We'll retry on ${new Date(nextRetryDate).toLocaleDateString()}. Please update your payment method to avoid service interruption.`
    : `Your Premium subscription payment failed. Please update your payment method to reactivate your subscription.`;

  return service.createNotification({
    userId,
    budgetAccountId: accountId,
    notificationTypeId: 'subscription_payment_failed',
    title,
    message,
    actionUrl,
    actionLabel: 'Update Payment Method',
    metadata: {
      subscription_id: subscriptionId,
      next_retry_date: nextRetryDate || null,
    },
  });
}

/**
 * Get all users with active trials that need notifications
 */
export async function getUsersNeedingTrialNotifications(): Promise<Array<{
  userId: string;
  accountId: number;
  trialEnd: string;
  daysRemaining: number;
}>> {
  const supabase = createServiceRoleClient();
  const today = new Date();
  
  // Get all trialing subscriptions with trial_end in the next 7 days
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  const { data: subscriptions, error } = await supabase
    .from('user_subscriptions')
    .select('user_id, account_id, trial_end')
    .eq('status', 'trialing')
    .not('trial_end', 'is', null)
    .lte('trial_end', sevenDaysFromNow.toISOString())
    .gte('trial_end', today.toISOString());

  if (error) {
    console.error('Error fetching trialing subscriptions:', error);
    return [];
  }

  if (!subscriptions) return [];

  // Calculate days remaining and filter for 7, 3, or 1 days
  const usersNeedingNotifications: Array<{
    userId: string;
    accountId: number;
    trialEnd: string;
    daysRemaining: number;
  }> = [];

  for (const sub of subscriptions) {
    if (!sub.trial_end || !sub.user_id) continue;
    
    const trialEnd = new Date(sub.trial_end);
    const diffTime = trialEnd.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Only notify at 7, 3, or 1 days remaining
    if (daysRemaining === 7 || daysRemaining === 3 || daysRemaining === 1) {
      // Check if we've already sent a notification for this day
      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', sub.user_id)
        .eq('notification_type_id', 'subscription_trial_ending')
        .eq('budget_account_id', sub.account_id)
        .gte('created_at', today.toISOString().split('T')[0])
        .limit(1);

      // Only add if we haven't sent a notification today for this account
      if (!existingNotifications || existingNotifications.length === 0) {
        usersNeedingNotifications.push({
          userId: sub.user_id,
          accountId: sub.account_id,
          trialEnd: sub.trial_end,
          daysRemaining,
        });
      }
    }
  }

  return usersNeedingNotifications;
}
