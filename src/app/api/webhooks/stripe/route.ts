import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';

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
        const userId = session.metadata?.user_id;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          console.error('❌ No user_id in checkout session metadata');
          break;
        }

        console.log(`📝 Processing checkout for user ${userId}, subscription ${subscriptionId}`);

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
        console.log(`📝 Subscription status: ${subscription.status}`);

        // Create or update subscription record
        const { data: subData, error: subError } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
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
            onConflict: 'user_id',
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
        ];

        const now = new Date().toISOString();
        const featureFlagsToInsert = premiumFeatures.map(featureName => ({
          user_id: userId,
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
            onConflict: 'user_id,feature_name',
          })
          .select();

        if (featuresError) {
          console.error('❌ Error enabling features:', featuresError);
          throw new Error(`Failed to enable features: ${featuresError.message}`);
        }

        console.log(`✅ Enabled ${featuresData?.length || 0} premium features`);

        // Create Income Buffer category (special initialization for income_buffer feature)
        const { data: existingBuffer, error: bufferCheckError } = await supabase
          .from('categories')
          .select('id')
          .eq('user_id', userId)
          .eq('name', 'Income Buffer')
          .maybeSingle();

        if (bufferCheckError) {
          console.error('❌ Error checking for Income Buffer:', bufferCheckError);
        }

        if (!existingBuffer && !bufferCheckError) {
          const { error: bufferCreateError } = await supabase
            .from('categories')
            .insert({
              user_id: userId,
              name: 'Income Buffer',
              monthly_amount: 0,
              current_balance: 0,
              sort_order: -1,
              is_system: true,
              is_buffer: true,
              category_type: 'target_balance',
              priority: 10,
              notes: 'Special category for smoothing irregular income. Add large payments here and withdraw monthly.',
            });

          if (bufferCreateError) {
            console.error('❌ Error creating Income Buffer category:', bufferCreateError);
          } else {
            console.log(`✅ Income Buffer category created`);
          }
        }

        console.log(`✅ Subscription created for user ${userId} with all premium features enabled`);
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

        await supabase
          .from('user_subscriptions')
          .update({
            tier: 'free',
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

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

        await supabase
          .from('user_subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);

        console.log(`⚠️ Payment failed for subscription ${subscriptionId}`);
        // TODO: Send payment failed email
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

