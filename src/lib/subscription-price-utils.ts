import Stripe from 'stripe';
import { createServiceRoleClient } from './supabase/server';
import { UserSubscription } from './subscription-utils';

/**
 * Get billing information from Stripe price
 */
export async function getPriceInfoFromStripe(priceId: string): Promise<{
  amount: number;
  interval: 'month' | 'year' | 'day' | 'week';
  currency: string;
} | null> {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const price = await stripe.prices.retrieve(priceId);

    if (!price.unit_amount || !price.recurring) {
      return null;
    }

    // Convert from cents to dollars
    const amount = price.unit_amount / 100;
    const interval = price.recurring.interval as 'month' | 'year' | 'day' | 'week';
    const currency = price.currency;

    return {
      amount,
      interval,
      currency,
    };
  } catch (error: any) {
    console.error(`Error fetching price info from Stripe for ${priceId}:`, error);
    return null;
  }
}

/**
 * Get billing information for a subscription
 * First checks database, then falls back to Stripe if not stored
 */
export async function getSubscriptionBillingInfo(
  subscription: UserSubscription | null
): Promise<{
  amount: number;
  interval: 'month' | 'year' | 'day' | 'week';
  currency: string;
  formattedAmount: string;
  formattedInterval: string;
} | null> {
  if (!subscription || !subscription.stripe_price_id) {
    return null;
  }

  const supabase = createServiceRoleClient();

  // Check if we have billing info stored in database
  if (subscription.billing_amount && subscription.billing_interval) {
    return {
      amount: subscription.billing_amount,
      interval: subscription.billing_interval as 'month' | 'year' | 'day' | 'week',
      currency: subscription.billing_currency || 'usd',
      formattedAmount: formatCurrency(subscription.billing_amount, subscription.billing_currency || 'usd'),
      formattedInterval: formatInterval(subscription.billing_interval),
    };
  }

  // Fall back to Stripe if not stored
  const priceInfo = await getPriceInfoFromStripe(subscription.stripe_price_id);
  
  if (!priceInfo) {
    return null;
  }

  // Store in database for future use
  await supabase
    .from('user_subscriptions')
    .update({
      billing_amount: priceInfo.amount,
      billing_interval: priceInfo.interval,
      billing_currency: priceInfo.currency,
    })
    .eq('account_id', subscription.account_id);

  return {
    ...priceInfo,
    formattedAmount: formatCurrency(priceInfo.amount, priceInfo.currency),
    formattedInterval: formatInterval(priceInfo.interval),
  };
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/**
 * Format billing interval
 */
function formatInterval(interval: string): string {
  switch (interval) {
    case 'month':
      return 'month';
    case 'year':
      return 'year';
    case 'day':
      return 'day';
    case 'week':
      return 'week';
    default:
      return interval;
  }
}

/**
 * Format billing description for display
 * e.g., "$100/year" or "$8.33/month"
 */
export function formatBillingDescription(billingInfo: {
  amount: number;
  interval: 'month' | 'year' | 'day' | 'week';
  currency: string;
}): string {
  const formattedAmount = formatCurrency(billingInfo.amount, billingInfo.currency);
  const intervalText = billingInfo.interval === 'month' ? 'month' : billingInfo.interval === 'year' ? 'year' : billingInfo.interval;
  
  return `${formattedAmount}/${intervalText}`;
}

/**
 * Get monthly equivalent for annual plans
 * e.g., $100/year = $8.33/month
 */
export function getMonthlyEquivalent(billingInfo: {
  amount: number;
  interval: 'month' | 'year' | 'day' | 'week';
}): number | null {
  if (billingInfo.interval === 'month') {
    return billingInfo.amount;
  }
  if (billingInfo.interval === 'year') {
    return Math.round((billingInfo.amount / 12) * 100) / 100; // Round to 2 decimal places
  }
  if (billingInfo.interval === 'week') {
    return Math.round((billingInfo.amount * 52 / 12) * 100) / 100;
  }
  if (billingInfo.interval === 'day') {
    return Math.round((billingInfo.amount * 365 / 12) * 100) / 100;
  }
  return null;
}
