import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { setupPremiumFeatures } from '@/lib/premium-feature-setup';
import { disablePremiumAccess } from '@/lib/subscription-access-control';
import { getPriceInfoFromStripe } from '@/lib/subscription-price-utils';

function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  return new Stripe(secretKey);
}

/**
 * POST /api/subscription/sync
 * Manually sync subscription from Stripe (fallback if webhook hasn't fired)
 */
export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Try to get customer ID from existing subscription
    // Also check if they were already premium (to detect upgrades)
    let customerId: string | null = null;
    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, tier, status')
      .eq('account_id', accountId)
      .maybeSingle();

    customerId = existingSub?.stripe_customer_id || null;
    
    // Check if this is an upgrade (was free/non-premium, now premium)
    const wasPremium = existingSub?.tier === 'premium' && ['active', 'trialing'].includes(existingSub?.status || '');

    // If no customer ID found, try to find it by searching Stripe customers by email
    const stripe = getStripe();
    if (!customerId) {
      const customers = await stripe.customers.list({
        email: user.email!,
        limit: 1,
      });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        return NextResponse.json(
          { error: 'No Stripe customer found. Please complete checkout first.' },
          { status: 404 }
        );
      }
    }

    // List all subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    });

    // Find the most recent subscription (prioritize active/trialing, but get any if none active)
    const foundSubscription = subscriptions.data.find(
      sub => ['active', 'trialing'].includes(sub.status)
    ) || subscriptions.data.find(
      sub => ['past_due', 'unpaid', 'incomplete', 'incomplete_expired'].includes(sub.status)
    ) || subscriptions.data.find(
      sub => sub.status === 'canceled'
    ) || subscriptions.data[0];

    if (!foundSubscription) {
      // No subscription found in Stripe - if we have one in DB, mark it as cancelled
      if (existingSub && existingSub.tier === 'premium') {
        await supabase
          .from('user_subscriptions')
          .update({
            tier: 'free',
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('account_id', accountId);
        
        await disablePremiumAccess(accountId);
        
        return NextResponse.json({
          success: true,
          subscription: { tier: 'free', status: 'canceled' },
          synced: true,
          changes: ['downgraded_to_free'],
        });
      }
      
      return NextResponse.json(
        { error: 'No subscription found in Stripe.' },
        { status: 404 }
      );
    }

    // Type assertion to ensure TypeScript recognizes Stripe.Subscription properties
    const stripeSubscription = foundSubscription as Stripe.Subscription;

    // Get account_id from subscription metadata
    const subscriptionAccountId = stripeSubscription.metadata?.account_id;
    const finalAccountId = subscriptionAccountId ? parseInt(subscriptionAccountId) : accountId;

    // Check if this is an upgrade (was free/non-premium, now premium)
    // Always check the final account's subscription status (in case metadata points to different account)
    let finalAccountWasPremium = false;
    if (finalAccountId !== accountId) {
      // If account IDs differ, check the final account's subscription status
      const { data: finalAccountSub } = await supabase
        .from('user_subscriptions')
        .select('tier, status')
        .eq('account_id', finalAccountId)
        .maybeSingle();
      
      finalAccountWasPremium = finalAccountSub?.tier === 'premium' && ['active', 'trialing'].includes(finalAccountSub?.status || '');
    } else {
      // Same account, use the wasPremium check from above
      finalAccountWasPremium = wasPremium;
    }
    
    const stripeStatus = stripeSubscription.status;
    const isActive = ['active', 'trialing'].includes(stripeStatus);
    const isCancelled = stripeStatus === 'canceled' || stripeStatus === 'incomplete_expired';
    const isPastDue = ['past_due', 'unpaid', 'incomplete'].includes(stripeStatus);
    const isUpgrading = !finalAccountWasPremium && isActive;
    
    // Calculate days late for past_due/unpaid subscriptions
    let daysLate: number | null = null;
    if (isPastDue && stripeSubscription.current_period_end) {
      const periodEnd = new Date(stripeSubscription.current_period_end * 1000);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24));
      daysLate = Math.max(0, daysDiff);
    }

    // Get price information from Stripe
    const priceId = stripeSubscription.items.data[0]?.price.id;
    let billingAmount: number | null = null;
    let billingInterval: string | null = null;
    let billingCurrency: string | null = null;

    if (priceId) {
      const priceInfo = await getPriceInfoFromStripe(priceId);
      if (priceInfo) {
        billingAmount = priceInfo.amount;
        billingInterval = priceInfo.interval;
        billingCurrency = priceInfo.currency;
      }
    }

    // Determine tier and status based on Stripe subscription
    const tier = isCancelled ? 'free' : 'premium';
    const changes: string[] = [];
    
    // Check if status changed
    if (existingSub) {
      if (existingSub.status !== stripeStatus) {
        changes.push(`status_changed_from_${existingSub.status}_to_${stripeStatus}`);
      }
      if (existingSub.tier !== tier) {
        changes.push(tier === 'free' ? 'downgraded_to_free' : 'upgraded_to_premium');
      }
    }

    // Update subscription record
    // Note: user_id is kept for backwards compatibility but can be null
    const updateData: any = {
      account_id: finalAccountId,
      user_id: user.id, // Keep for backwards compatibility
      tier,
      status: stripeStatus,
      stripe_customer_id: stripeSubscription.customer as string,
      stripe_subscription_id: stripeSubscription.id,
      stripe_price_id: priceId,
      billing_amount: billingAmount,
      billing_interval: billingInterval,
      billing_currency: billingCurrency,
      trial_start: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000).toISOString() : null,
      trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : null,
      current_period_start: stripeSubscription.current_period_start ? new Date(stripeSubscription.current_period_start * 1000).toISOString() : null,
      current_period_end: stripeSubscription.current_period_end ? new Date(stripeSubscription.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: stripeSubscription.cancel_at_period_end || false,
      canceled_at: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { data: subData, error: subError } = await supabase
      .from('user_subscriptions')
      .upsert(updateData, {
        onConflict: 'account_id',
      })
      .select()
      .single();

    if (subError) {
      console.error('Error syncing subscription:', subError);
      return NextResponse.json(
        { error: 'Failed to sync subscription' },
        { status: 500 }
      );
    }

    // Handle subscription state changes
    if (isCancelled || isPastDue) {
      // Disable premium access for cancelled or past due subscriptions
      try {
        await disablePremiumAccess(finalAccountId);
        changes.push('premium_access_disabled');
      } catch (error: any) {
        console.error('Error disabling premium access:', error);
      }
    } else if (isActive && tier === 'premium') {
      // Check if DB thinks subscription is inactive but Stripe says active
      const dbThinksInactive = existingSub && 
        (existingSub.tier === 'free' || 
         ['canceled', 'past_due', 'unpaid', 'incomplete_expired'].includes(existingSub.status || ''));
      
      // Re-enable premium access if Stripe says active but DB thinks inactive
      if (dbThinksInactive) {
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
        const featureFlagsToInsert = premiumFeatures.map(featureName => ({
          account_id: finalAccountId,
          user_id: user.id,
          feature_name: featureName,
          enabled: true,
          enabled_at: now,
          disabled_at: null,
          updated_at: now,
        }));

        const { error: featuresError } = await supabase
          .from('user_feature_flags')
          .upsert(featureFlagsToInsert, {
            onConflict: 'account_id,feature_name',
          });

        if (featuresError) {
          console.error('Warning: Failed to re-enable premium features:', featuresError);
        } else {
          console.log('✅ Re-enabled premium features (Stripe active but DB was inactive)');
          changes.push('premium_access_re_enabled');
          await setupPremiumFeatures(supabase, finalAccountId, user.id);
        }
      } else if (isUpgrading && subData) {
        // Only enable premium features if this is an upgrade (free -> premium)
        // Don't re-enable features if user was already premium (they may have disabled some)
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
        const featureFlagsToInsert = premiumFeatures.map(featureName => ({
          account_id: finalAccountId,
          user_id: user.id, // Include for backwards compatibility (can be null after migration)
          feature_name: featureName,
          enabled: true,
          enabled_at: now,
          disabled_at: null,
          updated_at: now,
        }));

        // Bulk upsert all premium features
        const { error: featuresError } = await supabase
          .from('user_feature_flags')
          .upsert(featureFlagsToInsert, {
            onConflict: 'account_id,feature_name',
          });

        if (featuresError) {
          console.error('Warning: Failed to enable premium features:', featuresError);
          // Don't fail the sync, just log the error
        } else {
          console.log('✅ Enabled premium features for account (upgrade detected)');
          
          // Perform setup actions for premium features (e.g., create Income Buffer category)
          await setupPremiumFeatures(supabase, finalAccountId, user.id);
        }
      } else if (finalAccountWasPremium) {
        console.log('ℹ️ Account already had premium - skipping feature auto-enable (user may have disabled some)');
      }
    }

    return NextResponse.json({
      success: true,
      subscription: subData,
      synced: true,
      changes,
      daysLate,
      requiresBillingUpdate: isPastDue,
    });
  } catch (error: any) {
    console.error('Error syncing subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync subscription' },
      { status: 500 }
    );
  }
}


