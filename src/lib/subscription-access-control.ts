import { createServiceRoleClient } from './supabase/server';
import { getUserSubscription, hasActiveSubscription } from './subscription-utils';

/**
 * Disable premium access for an account
 * This disables all premium features when subscription is inactive
 */
export async function disablePremiumAccess(accountId: number): Promise<void> {
  const supabase = createServiceRoleClient();
  
  // Get subscription to check status
  const subscription = await getUserSubscription(accountId);
  
  // Only disable if subscription is not active
  if (hasActiveSubscription(subscription)) {
    return; // Subscription is still active, don't disable
  }

  // Disable all premium features
  const premiumFeatures = [
    'monthly_funding_tracking',
    'category_types',
    'priority_system',
    'smart_allocation',
    'income_buffer',
    'goals',
    'loans',
    'advanced_reporting',
    'ai_chat',
    'automatic_imports',
  ];

  const now = new Date().toISOString();
  
  // Update all premium features to disabled
  for (const featureName of premiumFeatures) {
    await supabase
      .from('user_feature_flags')
      .update({
        enabled: false,
        disabled_at: now,
        updated_at: now,
      })
      .eq('account_id', accountId)
      .eq('feature_name', featureName);
  }

  console.log(`✅ Disabled premium access for account ${accountId}`);
}

/**
 * Check and disable premium access for accounts with expired trials or failed payments
 * This should be called daily to ensure premium access is properly revoked
 */
export async function checkAndDisableExpiredSubscriptions(): Promise<{
  disabled: number;
  errors: number;
}> {
  const supabase = createServiceRoleClient();
  const today = new Date();
  
  // Find subscriptions that should have premium disabled:
  // 1. Trialing subscriptions where trial_end has passed
  // 2. Subscriptions with status 'past_due', 'unpaid', 'canceled', 'incomplete_expired'
  
  const { data: expiredTrials, error: trialError } = await supabase
    .from('user_subscriptions')
    .select('account_id')
    .eq('status', 'trialing')
    .not('trial_end', 'is', null)
    .lt('trial_end', today.toISOString());

  const { data: inactiveSubscriptions, error: inactiveError } = await supabase
    .from('user_subscriptions')
    .select('account_id')
    .in('status', ['past_due', 'unpaid', 'canceled', 'incomplete_expired'])
    .eq('tier', 'premium');

  if (trialError || inactiveError) {
    console.error('Error fetching expired subscriptions:', trialError || inactiveError);
    return { disabled: 0, errors: 1 };
  }

  const accountIdsToDisable = new Set<number>();
  
  if (expiredTrials) {
    expiredTrials.forEach(sub => accountIdsToDisable.add(sub.account_id));
  }
  
  if (inactiveSubscriptions) {
    inactiveSubscriptions.forEach(sub => accountIdsToDisable.add(sub.account_id));
  }

  let disabled = 0;
  let errors = 0;

  // Disable premium access for each account
  for (const accountId of accountIdsToDisable) {
    try {
      await disablePremiumAccess(accountId);
      disabled++;
    } catch (error: any) {
      console.error(`Error disabling premium for account ${accountId}:`, error);
      errors++;
    }
  }

  return { disabled, errors };
}
