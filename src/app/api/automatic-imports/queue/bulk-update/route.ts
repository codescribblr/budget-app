import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * POST /api/automatic-imports/queue/bulk-update
 * Bulk update multiple queued imports
 */
export async function POST(request: Request) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const body = await request.json();
    const { transactionIds, updates } = body as {
      transactionIds: number[];
      updates: {
        date?: string;
        categoryId?: number | null;
        accountId?: number | null;
        creditCardId?: number | null;
        isHistorical?: boolean;
        tagIds?: number[];
      };
    };

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json({ error: 'transactionIds is required and must be an array' }, { status: 400 });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
      status: 'reviewing', // Change to reviewing when user edits
    };

    // Build update data - only include fields that are provided
    if (updates.date !== undefined) {
      updateData.transaction_date = updates.date;
    }
    if (updates.categoryId !== undefined) {
      updateData.suggested_category_id = updates.categoryId;
    }
    if (updates.accountId !== undefined) {
      updateData.target_account_id = updates.accountId;
    }
    if (updates.creditCardId !== undefined) {
      updateData.target_credit_card_id = updates.creditCardId;
    }
    if (updates.isHistorical !== undefined) {
      updateData.is_historical = updates.isHistorical;
    }
    if (updates.tagIds !== undefined) {
      // Validate tag IDs belong to the active account
      if (Array.isArray(updates.tagIds) && updates.tagIds.length > 0) {
        const { data: tags } = await supabase
          .from('tags')
          .select('id')
          .in('id', updates.tagIds)
          .eq('account_id', accountId);

        if (!tags || tags.length !== updates.tagIds.length) {
          return NextResponse.json(
            { error: 'One or more tags do not belong to the active account' },
            { status: 400 }
          );
        }
      }
      updateData.tag_ids = updates.tagIds;
    }

    // Update all transactions in bulk
    const { data, error } = await supabase
      .from('queued_imports')
      .update(updateData)
      .in('id', transactionIds)
      .eq('account_id', accountId)
      .select();

    if (error) {
      console.error('Error bulk updating queued imports:', error);
      return NextResponse.json({ error: 'Failed to update transactions' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      updated: data?.length || 0,
      transactions: data 
    });
  } catch (error: any) {
    console.error('Error in POST /api/automatic-imports/queue/bulk-update:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to bulk update transactions' },
      { status: 500 }
    );
  }
}
