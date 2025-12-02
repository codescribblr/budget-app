import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { setupPremiumFeatures } from '@/lib/premium-feature-setup';

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

    // Find the most recent active/trialing subscription
    const foundSubscription = subscriptions.data.find(
      sub => ['active', 'trialing'].includes(sub.status)
    ) || subscriptions.data[0];

    if (!foundSubscription) {
      return NextResponse.json(
        { error: 'No active subscription found in Stripe.' },
        { status: 404 }
      );
    }

    // Type assertion to ensure TypeScript recognizes Stripe.Subscription properties
    const activeSubscription = foundSubscription as Stripe.Subscription;

    // Get account_id from subscription metadata
    const subscriptionAccountId = activeSubscription.metadata?.account_id;
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
    
    const isUpgrading = !finalAccountWasPremium && ['active', 'trialing'].includes(activeSubscription.status);

    // Update subscription record
    // Note: user_id is kept for backwards compatibility but can be null
    const { data: subData, error: subError } = await supabase
      .from('user_subscriptions')
      .upsert({
        account_id: finalAccountId,
        user_id: user.id, // Keep for backwards compatibility
        tier: 'premium',
        status: activeSubscription.status,
        stripe_customer_id: activeSubscription.customer as string,
        stripe_subscription_id: activeSubscription.id,
        stripe_price_id: activeSubscription.items.data[0]?.price.id,
        trial_start: activeSubscription.trial_start ? new Date(activeSubscription.trial_start * 1000).toISOString() : null,
        trial_end: activeSubscription.trial_end ? new Date(activeSubscription.trial_end * 1000).toISOString() : null,
        current_period_start: (activeSubscription as any).current_period_start ? new Date((activeSubscription as any).current_period_start * 1000).toISOString() : null,
        current_period_end: (activeSubscription as any).current_period_end ? new Date((activeSubscription as any).current_period_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      }, {
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

    // Only enable premium features if this is an upgrade (free -> premium)
    // Don't re-enable features if user was already premium (they may have disabled some)
    if (isUpgrading && subData && ['active', 'trialing'].includes(subData.status) && subData.tier === 'premium') {
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

    return NextResponse.json({
      success: true,
      subscription: subData,
    });
  } catch (error: any) {
    console.error('Error syncing subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync subscription' },
      { status: 500 }
    );
  }
}

