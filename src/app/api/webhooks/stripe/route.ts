import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { setupPremiumFeatures } from '@/lib/premium-feature-setup';
import { createPaymentFailedNotification } from '@/lib/notifications/subscription-helpers';
import { disablePremiumAccess } from '@/lib/subscription-access-control';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  // Reject requests without signature header
  if (!signature) {
    console.error('❌ Webhook rejected: Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  let event: Stripe.Event;

  try {
    // This verifies:
    // 1. Signature is valid (proves request is from Stripe)
    // 2. Body hasn't been tampered with
    // 3. Timestamp is recent (prevents replay attacks)
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Use service role client to bypass RLS (webhooks aren't authenticated as users)
  const supabase = createServiceRoleClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.subscription as string;
        
        // Try to get metadata from session first, then from subscription if needed
        let userId = session.metadata?.user_id;
        let accountId = session.metadata?.account_id;
        
        // If metadata not in session, try to get it from the subscription
        if (!userId || !accountId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            userId = subscription.metadata?.user_id || userId;
            accountId = subscription.metadata?.account_id || accountId;
          } catch (err) {
            console.error('❌ Error retrieving subscription for metadata:', err);
          }
        }

        if (!userId || !accountId) {
          console.error('❌ Missing user_id or account_id in checkout session or subscription metadata');
          console.error('Session metadata:', session.metadata);
          break;
        }

        console.log(`📝 Processing checkout for user ${userId}, account ${accountId}, subscription ${subscriptionId}`);

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
        console.log(`📝 Subscription status: ${subscription.status}`);

        // Create or update subscription record
        // Note: user_id is kept for backwards compatibility but can be null
        const { data: subData, error: subError } = await supabase
          .from('user_subscriptions')
          .upsert({
            account_id: parseInt(accountId),
            user_id: userId, // Keep for backwards compatibility
            tier: 'premium',
            status: subscription.status,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            stripe_price_id: subscription.items.data[0]?.price.id,
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
            current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'account_id',
          })
          .select();

        if (subError) {
          console.error('❌ Error creating subscription:', subError);
          throw new Error(`Failed to create subscription: ${subError.message}`);
        }

        console.log(`✅ Subscription record created/updated:`, subData);

        // Auto-enable all premium features
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
          account_id: parseInt(accountId),
          user_id: userId, // Include for backwards compatibility (can be null after migration)
          feature_name: featureName,
          enabled: true,
          enabled_at: now,
          disabled_at: null,
          updated_at: now,
        }));

        // Bulk upsert all premium features
        const { data: featuresData, error: featuresError } = await supabase
          .from('user_feature_flags')
          .upsert(featureFlagsToInsert, {
            onConflict: 'account_id,feature_name',
          })
          .select();

        if (featuresError) {
          console.error('❌ Error enabling features:', featuresError);
          throw new Error(`Failed to enable features: ${featuresError.message}`);
        }

        console.log(`✅ Enabled ${featuresData?.length || 0} premium features`);

        // Perform setup actions for premium features (e.g., create Income Buffer category)
        await setupPremiumFeatures(supabase, parseInt(accountId), userId);

        console.log(`✅ Subscription created for account ${accountId} with all premium features enabled`);
        // TODO: Send welcome email
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.user_id;

        if (!userId) break;

        await supabase
          .from('user_subscriptions')
          .update({
            status: subscription.status,
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
            current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        console.log(`✅ Subscription updated for user ${userId}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Get account_id before updating
        const { data: existingSub } = await supabase
          .from('user_subscriptions')
          .select('account_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        await supabase
          .from('user_subscriptions')
          .update({
            tier: 'free',
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        // Disable premium access
        if (existingSub?.account_id) {
          try {
            await disablePremiumAccess(existingSub.account_id);
          } catch (error: any) {
            console.error(`Error disabling premium access:`, error);
          }
        }

        console.log(`✅ Subscription canceled for subscription ${subscription.id}`);
        // TODO: Send cancellation confirmation email
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any;
        console.log(`✅ Invoice paid: ${invoice.id}`);
        // TODO: Send receipt email
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;

        // Get subscription details to find user and account
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('user_id, account_id, stripe_subscription_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (!subscription) {
          console.error(`⚠️ Subscription not found for payment failure: ${subscriptionId}`);
          break;
        }

        // Update subscription status
        await supabase
          .from('user_subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);

        // Get next retry date from invoice if available
        const nextRetryDate = invoice.next_payment_attempt 
          ? new Date(invoice.next_payment_attempt * 1000).toISOString()
          : undefined;

        // Send notification
        if (subscription.user_id && subscription.account_id) {
          try {
            await createPaymentFailedNotification(
              subscription.user_id,
              subscription.account_id,
              subscriptionId,
              nextRetryDate
            );
          } catch (error: any) {
            console.error(`Error sending payment failed notification:`, error);
          }
        }

        // Disable premium access immediately
        try {
          await disablePremiumAccess(subscription.account_id);
        } catch (error: any) {
          console.error(`Error disabling premium access:`, error);
        }

        console.log(`⚠️ Payment failed for subscription ${subscriptionId}, premium access disabled`);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}


