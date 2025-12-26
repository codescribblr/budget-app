import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/recurring-transactions/bulk-delete
 * Delete multiple recurring transactions at once
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const body = await request.json();
    const { ids } = body as { ids: number[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids must be a non-empty array' },
        { status: 400 }
      );
    }

    // Verify all IDs belong to the user's account
    const { data: recurringTransactions, error: checkError } = await supabase
      .from('recurring_transactions')
      .select('id')
      .in('id', ids)
      .eq('user_id', user.id)
      .eq('budget_account_id', accountId);

    if (checkError) throw checkError;

    if (!recurringTransactions || recurringTransactions.length !== ids.length) {
      return NextResponse.json(
        { error: 'One or more recurring transactions not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete all in one query
    const { error: deleteError } = await supabase
      .from('recurring_transactions')
      .delete()
      .in('id', ids)
      .eq('user_id', user.id)
      .eq('budget_account_id', accountId);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      deleted: ids.length,
    });
  } catch (error: any) {
    console.error('Error bulk deleting recurring transactions:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to delete recurring transactions' },
      { status: 500 }
    );
  }
}



