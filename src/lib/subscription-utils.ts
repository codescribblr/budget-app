import { createClient } from './supabase/server';
import type Stripe from 'stripe';
import { getActiveAccountId } from './account-context';

/**
 * Custom error for premium subscription requirements
 */
export class PremiumRequiredError extends Error {
  constructor(message: string = 'Premium subscription required') {
    super(message);
    this.name = 'PremiumRequiredError';
  }
}

export interface UserSubscription {
  id: number;
  account_id: number;
  tier: 'free' | 'premium';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  billing_amount: number | null;
  billing_interval: 'month' | 'year' | 'day' | 'week' | null;
  billing_currency: string | null;
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get account's subscription from database
 */
export async function getUserSubscription(accountId: number | null): Promise<UserSubscription | null> {
  const supabase = await createClient();
  
  if (!accountId) {
    return null;
  }
  
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
  
  return data;
}

/**
 * Check if subscription is in an active state
 */
export function hasActiveSubscription(subscription: UserSubscription | null): boolean {
  if (!subscription) return false;
  
  const activeStatuses = ['active', 'trialing'];
  return activeStatuses.includes(subscription.status);
}

/**
 * Check if user has premium access
 */
export function isPremiumUser(subscription: UserSubscription | null): boolean {
  if (!subscription) return false;
  
  return subscription.tier === 'premium' && hasActiveSubscription(subscription);
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(subscription: UserSubscription | null): number | null {
  if (!subscription || subscription.status !== 'trialing' || !subscription.trial_end) {
    return null;
  }
  
  const trialEnd = new Date(subscription.trial_end);
  const now = new Date();
  const diffTime = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Require premium subscription (throws PremiumRequiredError if not premium)
 */
export async function requirePremiumSubscription(accountId: number | null): Promise<UserSubscription> {
  const subscription = await getUserSubscription(accountId);

  if (!isPremiumUser(subscription)) {
    throw new PremiumRequiredError('Premium subscription required');
  }

  return subscription!;
}

/**
 * Get or create Stripe customer for account
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  stripe: Stripe
): Promise<string> {
  const supabase = await createClient();
  const accountId = await getActiveAccountId();
  
  if (!accountId) {
    throw new Error('No active account');
  }
  
  // Check if customer already exists for this account
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('account_id', accountId)
    .maybeSingle();
  
  if (subscription?.stripe_customer_id) {
    return subscription.stripe_customer_id;
  }
  
  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: { 
      user_id: userId,
      account_id: accountId.toString()
    }
  });
  
  // Store customer ID (create free subscription if doesn't exist)
  await supabase
    .from('user_subscriptions')
    .upsert({
      account_id: accountId,
      user_id: userId, // Keep for backwards compatibility
      stripe_customer_id: customer.id,
      tier: 'free',
      status: 'active',
    }, {
      onConflict: 'account_id'
    });
  
  return customer.id;
}


