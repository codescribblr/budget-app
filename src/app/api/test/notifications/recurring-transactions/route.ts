import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { createClient } from '@/lib/supabase/server';
import { createRecurringTransactionNotification } from '@/lib/notifications/helpers';

/**
 * POST /api/test/notifications/recurring-transactions
 * Test endpoint to manually trigger recurring transaction notifications
 * 
 * Body: {
 *   type: 'upcoming' | 'insufficient_funds' | 'amount_changed',
 *   recurringTransactionId?: number, // Optional: use existing recurring transaction
 *   merchantName?: string, // Optional: for test data if no recurring transaction
 *   expectedAmount?: number, // Optional: for test data if no recurring transaction
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
    const { type, recurringTransactionId, merchantName, expectedAmount } = body;

    if (!type || !['upcoming', 'insufficient_funds', 'amount_changed'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: upcoming, insufficient_funds, amount_changed' },
        { status: 400 }
      );
    }

    let rtId: number;
    let merchant: string;
    let amount: number;
    let currentBalance: number | undefined;
    let shortfall: number | undefined;

    // If recurringTransactionId provided, fetch the recurring transaction
    if (recurringTransactionId) {
      const { data: rt, error: rtError } = await supabase
        .from('recurring_transactions')
        .select('id, merchant_name, expected_amount, budget_account_id, account_id')
        .eq('id', recurringTransactionId)
        .eq('user_id', user.id)
        .eq('budget_account_id', accountId)
        .single();

      if (rtError || !rt) {
        return NextResponse.json(
          { error: 'Recurring transaction not found' },
          { status: 404 }
        );
      }

      rtId = rt.id;
      merchant = rt.merchant_name;
      amount = Math.abs(rt.expected_amount || 0);

      // For insufficient_funds, get account balance
      if (type === 'insufficient_funds' && rt.account_id) {
        const { data: account } = await supabase
          .from('accounts')
          .select('balance')
          .eq('id', rt.account_id)
          .single();

        if (account) {
          currentBalance = account.balance;
          shortfall = amount - account.balance;
        }
      }
    } else {
      // Use provided test data or defaults
      merchant = merchantName || 'Test Merchant';
      amount = expectedAmount || 100.00;

      // Create a temporary recurring transaction for testing
      const { data: newRt, error: createError } = await supabase
        .from('recurring_transactions')
        .insert({
          user_id: user.id,
          budget_account_id: accountId,
          merchant_name: merchant,
          expected_amount: amount,
          frequency: 'monthly',
          transaction_type: 'expense',
          is_active: true,
          is_confirmed: true,
          reminder_enabled: true,
          next_expected_date: new Date().toISOString().split('T')[0],
        })
        .select('id')
        .single();

      if (createError || !newRt) {
        return NextResponse.json(
          { error: 'Failed to create test recurring transaction', details: createError?.message },
          { status: 500 }
        );
      }

      rtId = newRt.id;

      // For insufficient_funds, get account balance if account exists
      if (type === 'insufficient_funds') {
        const { data: accounts } = await supabase
          .from('accounts')
          .select('balance')
          .eq('budget_account_id', accountId)
          .limit(1)
          .single();

        if (accounts) {
          currentBalance = accounts.balance;
          shortfall = amount - accounts.balance;
        } else {
          // Use test values if no account
          currentBalance = amount * 0.5; // 50% of expected amount
          shortfall = amount - currentBalance;
        }
      }
    }

    // Create the notification based on type
    let notificationId: number;

    switch (type) {
      case 'upcoming':
        // Set daysUntilDue to 0 so notification sends immediately (not scheduled)
        notificationId = await createRecurringTransactionNotification(
          user.id,
          accountId,
          rtId,
          'upcoming',
          {
            merchantName: merchant,
            expectedAmount: amount,
            dueDate: new Date().toISOString().split('T')[0], // Today
            daysUntilDue: 0, // Due today = sends immediately
          }
        );
        break;

      case 'insufficient_funds':
        notificationId = await createRecurringTransactionNotification(
          user.id,
          accountId,
          rtId,
          'insufficient_funds',
          {
            merchantName: merchant,
            expectedAmount: amount,
            currentBalance: currentBalance || amount * 0.5,
            shortfall: shortfall || amount * 0.5,
          }
        );
        break;

      case 'amount_changed':
        notificationId = await createRecurringTransactionNotification(
          user.id,
          accountId,
          rtId,
          'amount_changed',
          {
            merchantName: merchant,
            expectedAmount: amount,
            oldAmount: amount * 0.9, // 10% increase
            newAmount: amount,
          }
        );
        break;

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
      recurringTransactionId: rtId,
      notification: {
        type,
        merchantName: merchant,
        expectedAmount: amount,
        ...(type === 'insufficient_funds' && {
          currentBalance,
          shortfall,
        }),
        ...(type === 'amount_changed' && {
          oldAmount: amount * 0.9,
          newAmount: amount,
        }),
      },
    });
  } catch (error: any) {
    console.error('Error creating test notification:', error);
    return NextResponse.json(
      { error: 'Failed to create test notification', details: error.message },
      { status: 500 }
    );
  }
}


