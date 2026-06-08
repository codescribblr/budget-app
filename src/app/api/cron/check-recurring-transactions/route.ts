import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createRecurringTransactionNotification } from '@/lib/notifications/helpers';
import { runScheduledJob } from '@/lib/scheduled-jobs';

/**
 * GET /api/cron/check-recurring-transactions
 * Check for upcoming recurring transactions and send notifications
 * 
 * This endpoint should be called by:
 * - Vercel Cron (configured in vercel.json)
 * - Supabase Edge Function with pg_cron
 * - External cron service
 * 
 * Security: In production, verify the request is from a trusted source
 * using Authorization header or Vercel Cron secret
 */
async function checkRecurringTransactions() {
  const supabase = createServiceRoleClient();

  // Get all active recurring transactions with next_expected_date within next 7 days
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const { data: recurringTransactions, error } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('is_active', true)
    .eq('reminder_enabled', true)
    .not('next_expected_date', 'is', null)
    .gte('next_expected_date', today.toISOString().split('T')[0])
    .lte('next_expected_date', nextWeek.toISOString().split('T')[0]);

  if (error) {
    console.error('Error fetching recurring transactions:', error);
    return;
  }

  if (!recurringTransactions || recurringTransactions.length === 0) {
    return;
  }

  // Process each recurring transaction
  for (const rt of recurringTransactions) {
    try {
      // Get user preference for reminder_days_before
      const { data: userPref } = await supabase
        .from('user_notification_preferences')
        .select('settings')
        .eq('user_id', rt.user_id)
        .eq('notification_type_id', 'recurring_transaction_upcoming')
        .single();

      const reminderDays = userPref?.settings?.reminder_days_before || rt.reminder_days_before || 2;

      // Calculate days until due
      const dueDate = new Date(rt.next_expected_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Check if we should send notification (reminder_days_before days before)
      if (daysUntilDue === reminderDays || daysUntilDue === 0) {
        // Check if notification already sent
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', rt.user_id)
          .eq('notification_type_id', 'recurring_transaction_upcoming')
          .eq('metadata->>recurring_transaction_id', rt.id.toString())
          .gte('created_at', today.toISOString().split('T')[0])
          .single();

        if (existingNotification) {
          // Already sent today, skip
          continue;
        }

        // Check account balance if account is linked
        let hasSufficientFunds = true;
        let currentBalance = 0;
        let shortfall: number | null = null;

        if (rt.account_id) {
          const { data: account } = await supabase
            .from('accounts')
            .select('balance')
            .eq('id', rt.account_id)
            .single();

          if (account) {
            currentBalance = account.balance;
            hasSufficientFunds = account.balance >= (rt.expected_amount || 0);
            if (!hasSufficientFunds) {
              shortfall = (rt.expected_amount || 0) - account.balance;
            }
          }
        } else if (rt.credit_card_id) {
          const { data: creditCard } = await supabase
            .from('credit_cards')
            .select('credit_limit, current_balance')
            .eq('id', rt.credit_card_id)
            .single();

          if (creditCard) {
            const availableCredit = creditCard.credit_limit - creditCard.current_balance;
            currentBalance = availableCredit;
            hasSufficientFunds = availableCredit >= (rt.expected_amount || 0);
            if (!hasSufficientFunds) {
              shortfall = (rt.expected_amount || 0) - availableCredit;
            }
          }
        }

        // Send upcoming notification
        await createRecurringTransactionNotification(
          rt.user_id,
          rt.budget_account_id,
          rt.id,
          'upcoming',
          {
            merchantName: rt.merchant_name,
            expectedAmount: rt.expected_amount || 0,
            dueDate: rt.next_expected_date,
            daysUntilDue,
          }
        );

        // Send insufficient funds notification if needed
        if (!hasSufficientFunds) {
          await createRecurringTransactionNotification(
            rt.user_id,
            rt.budget_account_id,
            rt.id,
            'insufficient_funds',
            {
              merchantName: rt.merchant_name,
              expectedAmount: rt.expected_amount || 0,
              currentBalance,
              shortfall: shortfall ?? undefined,
            }
          );
        }

        // Update next_expected_date (calculate next occurrence)
        // This is a simplified calculation - in production, use proper date calculation
        const nextDate = new Date(dueDate);
        switch (rt.frequency) {
          case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
          case 'biweekly':
            nextDate.setDate(nextDate.getDate() + 14);
            break;
          case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
          case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
          case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        }

        await supabase
          .from('recurring_transactions')
          .update({
            last_occurrence_date: rt.next_expected_date,
            next_expected_date: nextDate.toISOString().split('T')[0],
            occurrence_count: rt.occurrence_count + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', rt.id);
      }
    } catch (error: any) {
      console.error(`Error processing recurring transaction ${rt.id}:`, error);
      // Continue with next transaction
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Run the job with automatic status tracking
    const result = await runScheduledJob(
      'check-recurring-transactions',
      checkRecurringTransactions
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Recurring transactions check completed',
        duration: result.duration,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Recurring transactions check failed',
        error: result.error,
        duration: result.duration,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in check recurring transactions cron:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}




