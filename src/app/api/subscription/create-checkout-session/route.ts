import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getOrCreateStripeCustomer } from '@/lib/subscription-utils';
import { getActiveAccountId } from '@/lib/account-context';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();
    const { successUrl, cancelUrl } = await request.json();

    // Get active account ID
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(user.id, user.email!, stripe);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PREMIUM_PRICE_ID!,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 60,
        metadata: {
          user_id: user.id,
          account_id: accountId.toString(),
        },
      },
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/subscription?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/subscription?canceled=true`,
      metadata: {
        user_id: user.id,
        account_id: accountId.toString(),
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

