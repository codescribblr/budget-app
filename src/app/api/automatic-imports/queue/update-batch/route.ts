import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * PUT /api/automatic-imports/queue/update-batch
 * Update multiple queued imports in a batch (e.g., change account or historical flag)
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
      batchId,
      targetAccountId,
      targetCreditCardId,
      isHistorical,
    } = body;

    if (!batchId) {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Allow updating these fields
    // Handle account selection: if account is provided (even null), set it and clear credit card
    if (targetAccountId !== undefined) {
      updateData.target_account_id = targetAccountId;
      updateData.target_credit_card_id = null; // Clear credit card if account is set
    }
    // Handle credit card selection: only if credit card is explicitly provided AND account is not being set
    // This prevents clearing account_id when targetCreditCardId is null but targetAccountId is set
    if (targetCreditCardId !== undefined && targetAccountId === undefined) {
      updateData.target_credit_card_id = targetCreditCardId;
      updateData.target_account_id = null; // Clear account if credit card is set
    }
    if (isHistorical !== undefined) {
      updateData.is_historical = isHistorical;
    }
    
    // Log for debugging
    console.log('Updating batch:', { batchId, updateData, body: { targetAccountId, targetCreditCardId, isHistorical } });

    // Update all queued imports in this batch
    const { data, error } = await supabase
      .from('queued_imports')
      .update(updateData)
      .eq('account_id', accountId)
      .eq('source_batch_id', batchId)
      .select('id');

    if (error) {
      console.error('Error updating queued import batch:', error);
      return NextResponse.json({ error: 'Failed to update queued import batch' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      updated: data?.length || 0,
    });
  } catch (error: any) {
    console.error('Error in PUT /api/automatic-imports/queue/update-batch:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update queued import batch' },
      { status: 500 }
    );
  }
}
