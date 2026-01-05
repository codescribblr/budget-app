import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/recurring-transactions/[id]
 * Get a specific recurring transaction
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { id } = await params;

    const { data: recurringTransaction, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('id', parseInt(id))
      .eq('user_id', user.id)
      .eq('budget_account_id', accountId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Recurring transaction not found' }, { status: 404 });
      }
      throw error;
    }

    // Normalize amounts to always be positive (even if stored as negative)
    const normalized = {
      ...recurringTransaction,
      expected_amount: recurringTransaction.expected_amount ? Math.abs(recurringTransaction.expected_amount) : null,
      amount_variance: recurringTransaction.amount_variance ? Math.abs(recurringTransaction.amount_variance) : 0,
    };

    return NextResponse.json({ recurringTransaction: normalized });
  } catch (error: any) {
    console.error('Error fetching recurring transaction:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch recurring transaction' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/recurring-transactions/[id]
 * Update a recurring transaction
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { id } = await params;
    const body = await request.json();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Allow updating most fields
    const allowedFields = [
      'merchant_name',
      'description_pattern',
      'frequency',
      'interval',
      'day_of_month',
      'day_of_week',
      'week_of_month',
      'is_amount_variable',
      'category_id',
      'account_id',
      'credit_card_id',
      'is_active',
      'is_confirmed',
      'notes',
      'reminder_days_before',
      'reminder_enabled',
      'next_expected_date',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle amount fields separately to ensure they're always positive
    if (body.expected_amount !== undefined) {
      updateData.expected_amount = body.expected_amount ? Math.abs(body.expected_amount) : null;
    }
    if (body.amount_variance !== undefined) {
      updateData.amount_variance = body.amount_variance ? Math.abs(body.amount_variance) : 0;
    }

    const { data: recurringTransaction, error } = await supabase
      .from('recurring_transactions')
      .update(updateData)
      .eq('id', parseInt(id))
      .eq('user_id', user.id)
      .eq('budget_account_id', accountId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Recurring transaction not found' }, { status: 404 });
      }
      throw error;
    }

    // Normalize amounts to always be positive (even if stored as negative)
    const normalized = {
      ...recurringTransaction,
      expected_amount: recurringTransaction.expected_amount ? Math.abs(recurringTransaction.expected_amount) : null,
      amount_variance: recurringTransaction.amount_variance ? Math.abs(recurringTransaction.amount_variance) : 0,
    };

    return NextResponse.json({ recurringTransaction: normalized });
  } catch (error: any) {
    console.error('Error updating recurring transaction:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to update recurring transaction' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/recurring-transactions/[id]
 * Delete a recurring transaction
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('id', parseInt(id))
      .eq('user_id', user.id)
      .eq('budget_account_id', accountId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting recurring transaction:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to delete recurring transaction' },
      { status: 500 }
    );
  }
}




