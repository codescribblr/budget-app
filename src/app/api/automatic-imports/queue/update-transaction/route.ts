import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * PUT /api/automatic-imports/queue/update-transaction
 * Update a queued import transaction (for on-the-fly editing in preview)
 */
export async function PUT(request: Request) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const body = await request.json();
    const { 
      queuedImportId, 
      transaction_date,
      description,
      merchant,
      amount,
      transaction_type,
      target_account_id,
      target_credit_card_id,
      is_historical,
      suggested_category_id,
      tag_ids,
    } = body;

    if (!queuedImportId) {
      return NextResponse.json({ error: 'queuedImportId is required' }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Allow updating these fields
    if (transaction_date !== undefined) updateData.transaction_date = transaction_date;
    if (description !== undefined) updateData.description = description;
    if (merchant !== undefined) updateData.merchant = merchant;
    if (amount !== undefined) updateData.amount = amount;
    if (transaction_type !== undefined) updateData.transaction_type = transaction_type;
    if (target_account_id !== undefined) updateData.target_account_id = target_account_id;
    if (target_credit_card_id !== undefined) updateData.target_credit_card_id = target_credit_card_id;
    if (is_historical !== undefined) updateData.is_historical = is_historical;
    if (suggested_category_id !== undefined) updateData.suggested_category_id = suggested_category_id;
    if (tag_ids !== undefined) updateData.tag_ids = tag_ids;

    // If status is pending, change to reviewing when user starts editing
    updateData.status = 'reviewing';

    const { data, error } = await supabase
      .from('queued_imports')
      .update(updateData)
      .eq('id', queuedImportId)
      .eq('account_id', accountId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Queued import not found' }, { status: 404 });
      }
      console.error('Error updating queued import transaction:', error);
      return NextResponse.json({ error: 'Failed to update queued import transaction' }, { status: 500 });
    }

    return NextResponse.json({ import: data });
  } catch (error: any) {
    console.error('Error in PUT /api/automatic-imports/queue/update-transaction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update queued import transaction' },
      { status: 500 }
    );
  }
}
