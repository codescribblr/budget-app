import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { getUserSubscription } from '@/lib/subscription-utils';
import { getSubscriptionBillingInfo, formatBillingDescription } from '@/lib/subscription-price-utils';

/**
 * GET /api/subscription/billing-info
 * Get billing information for the current user's subscription
 */
export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    const subscription = await getUserSubscription(accountId);
    const billingInfo = await getSubscriptionBillingInfo(subscription);

    if (!billingInfo) {
      return NextResponse.json({
        billingDescription: '$100/year', // Default fallback
        amount: 100,
        interval: 'year',
      });
    }

    return NextResponse.json({
      billingDescription: formatBillingDescription(billingInfo),
      amount: billingInfo.amount,
      interval: billingInfo.interval,
      currency: billingInfo.currency,
      formattedAmount: billingInfo.formattedAmount,
    });
  } catch (error: any) {
    console.error('Error fetching billing info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing info' },
      { status: 500 }
    );
  }
}
