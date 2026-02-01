import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { createTrialEndingNotification, createPaymentFailedNotification } from '@/lib/notifications/subscription-helpers';

/**
 * POST /api/test/notifications/subscriptions
 * Test endpoint to manually trigger subscription notifications
 * 
 * Body: {
 *   type: 'trial_ending' | 'payment_failed',
 *   daysRemaining?: number, // For trial_ending: 7, 3, or 1
 *   trialEndDate?: string, // ISO date string, optional
 *   subscriptionId?: string, // For payment_failed: Stripe subscription ID
 *   nextRetryDate?: string, // ISO date string, optional for payment_failed
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { type, daysRemaining, trialEndDate, subscriptionId, nextRetryDate } = body;

    if (!type || !['trial_ending', 'payment_failed'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: trial_ending, payment_failed' },
        { status: 400 }
      );
    }

    let notificationId: number;

    switch (type) {
      case 'trial_ending': {
        // Default to 7 days if not specified
        const days = daysRemaining !== undefined ? parseInt(daysRemaining.toString()) : 7;
        
        // Validate days
        if (![7, 3, 1].includes(days)) {
          return NextResponse.json(
            { error: 'daysRemaining must be 7, 3, or 1' },
            { status: 400 }
          );
        }

        // Calculate trial end date if not provided
        let endDate: string;
        if (trialEndDate) {
          endDate = trialEndDate;
        } else {
          const end = new Date();
          end.setDate(end.getDate() + days);
          endDate = end.toISOString();
        }

        notificationId = await createTrialEndingNotification(
          user.id,
          accountId,
          days,
          endDate
        );
        break;
      }

      case 'payment_failed': {
        const subId = subscriptionId || `test_sub_${Date.now()}`;
        const retryDate = nextRetryDate || undefined;

        notificationId = await createPaymentFailedNotification(
          user.id,
          accountId,
          subId,
          retryDate
        );
        break;
      }

      default:
        return NextResponse.json(
          { error: `Invalid notification type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Test ${type} notification created successfully`,
      notificationId,
      notification: {
        type,
        ...(type === 'trial_ending' && {
          daysRemaining: daysRemaining || 7,
          trialEndDate: trialEndDate || new Date(Date.now() + (daysRemaining || 7) * 24 * 60 * 60 * 1000).toISOString(),
        }),
        ...(type === 'payment_failed' && {
          subscriptionId: subscriptionId || `test_sub_${Date.now()}`,
          nextRetryDate: nextRetryDate || null,
        }),
      },
    });
  } catch (error: any) {
    console.error('Error creating test subscription notification:', error);
    return NextResponse.json(
      { error: 'Failed to create test notification', details: error.message },
      { status: 500 }
    );
  }
}
