import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getUserSubscription } from '@/lib/subscription-utils';
import { getActiveAccountId } from '@/lib/account-context';

export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    const subscription = await getUserSubscription(accountId);

    // If no subscription exists, return default free tier
    if (!subscription) {
      return NextResponse.json({
        subscription: {
          tier: 'free',
          status: 'active',
          stripe_customer_id: null,
          stripe_subscription_id: null,
          trial_start: null,
          trial_end: null,
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
        },
      });
    }

    return NextResponse.json({
      subscription,
    });
  } catch (error: any) {
    console.error('Error fetching subscription status:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}

