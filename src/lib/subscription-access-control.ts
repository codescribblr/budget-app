import { createServiceRoleClient } from './supabase/server';
import { getUserSubscription, hasActiveSubscription } from './subscription-utils';

/**
 * Disable premium access for an account
 * This disables all premium features when subscription is inactive
 * IMPORTANT: This does NOT delete any user data - only disables feature flags
 * All data (goals, loans, monthly funding tracking, etc.) is preserved
 */
export async function disablePremiumAccess(accountId: number): Promise<void> {
  const supabase = createServiceRoleClient();
  
  // Get subscription to check status
  const subscription = await getUserSubscription(accountId);
  
  // Only disable if subscription is not active
  if (hasActiveSubscription(subscription)) {
    return; // Subscription is still active, don't disable
  }

  const now = new Date().toISOString();

  // Update subscription status if it's still marked as trialing but trial has ended
  if (subscription && subscription.status === 'trialing' && subscription.trial_end) {
    const trialEndDate = new Date(subscription.trial_end);
    if (trialEndDate < new Date()) {
      // Trial has ended - update status to canceled
      await supabase
        .from('user_subscriptions')
        .update({
          status: 'canceled',
          updated_at: now,
        })
        .eq('account_id', accountId);
      
      console.log(`📝 Updated subscription status to 'canceled' for account ${accountId} (trial ended)`);
    }
  }

  // Disable all premium features
  // NOTE: This only disables feature flags - NO DATA IS DELETED
  // All user data (goals, loans, monthly funding records, etc.) remains intact
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

  // Update all premium features to disabled
  // Using upsert to ensure feature flags exist even if they weren't created before
  for (const featureName of premiumFeatures) {
    await supabase
      .from('user_feature_flags')
      .upsert({
        account_id: accountId,
        feature_name: featureName,
        enabled: false,
        disabled_at: now,
        updated_at: now,
      }, {
        onConflict: 'account_id,feature_name',
      });
  }

  console.log(`✅ Disabled premium access for account ${accountId} (features disabled, data preserved)`);
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
