import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { createClient } from '@/lib/supabase/server';
import { detectRecurringTransactions } from '@/lib/recurring-transactions/detection';

/**
 * GET /api/recurring-transactions
 * Get all recurring transactions for the current account
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const isConfirmed = searchParams.get('isConfirmed');

    let query = supabase
      .from('recurring_transactions')
      .select(`
        *,
        accounts (
          id,
          name
        ),
        credit_cards (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('budget_account_id', accountId)
      .order('next_expected_date', { ascending: true });

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }
    if (isConfirmed !== null) {
      query = query.eq('is_confirmed', isConfirmed === 'true');
    }

    const { data: recurringTransactions, error } = await query;

    if (error) throw error;

    // Normalize amounts to always be positive (even if stored as negative)
    const normalized = (recurringTransactions || []).map((rt: any) => ({
      ...rt,
      expected_amount: rt.expected_amount ? Math.abs(rt.expected_amount) : null,
      amount_variance: rt.amount_variance ? Math.abs(rt.amount_variance) : 0,
    }));

    return NextResponse.json({ recurringTransactions: normalized });
  } catch (error: any) {
    console.error('Error fetching recurring transactions:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch recurring transactions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recurring-transactions
 * Create a new recurring transaction (manual or from detection)
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const body = await request.json();
    const {
      merchantGroupId,
      merchantName,
      descriptionPattern,
      frequency,
      interval,
      dayOfMonth,
      dayOfWeek,
      weekOfMonth,
      expectedAmount,
      amountVariance,
      isAmountVariable,
      transactionType,
      categoryId,
      accountId: bankAccountId,
      creditCardId,
      detectionMethod,
      confidenceScore,
      notes,
      reminderDaysBefore,
      reminderEnabled,
    } = body;

    const { data: recurringTransaction, error } = await supabase
      .from('recurring_transactions')
      .insert({
        user_id: user.id,
        budget_account_id: accountId,
        merchant_group_id: merchantGroupId || null,
        merchant_name: merchantName,
        description_pattern: descriptionPattern || null,
        frequency,
        interval: interval || 1,
        day_of_month: dayOfMonth || null,
        day_of_week: dayOfWeek || null,
        week_of_month: weekOfMonth || null,
        expected_amount: expectedAmount ? Math.abs(expectedAmount) : null,
        amount_variance: amountVariance ? Math.abs(amountVariance) : 0,
        is_amount_variable: isAmountVariable || false,
        transaction_type: transactionType,
        category_id: categoryId || null,
        account_id: bankAccountId || null,
        credit_card_id: creditCardId || null,
        detection_method: detectionMethod || 'manual',
        confidence_score: confidenceScore || 0,
        notes: notes || null,
        reminder_days_before: reminderDaysBefore || 2,
        reminder_enabled: reminderEnabled !== undefined ? reminderEnabled : true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ recurringTransaction }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating recurring transaction:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to create recurring transaction' },
      { status: 500 }
    );
  }
}




