import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * PUT /api/automatic-imports/queue/[id]
 * Update a queued import (e.g., is_historical flag)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { id } = await params;
    const queuedImportId = parseInt(id);

    if (isNaN(queuedImportId)) {
      return NextResponse.json({ error: 'Invalid queued import ID' }, { status: 400 });
    }

    const body = await request.json();
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Allow updating these fields
    if (body.is_historical !== undefined) updateData.is_historical = body.is_historical;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.review_notes !== undefined) updateData.review_notes = body.review_notes;

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
      console.error('Error updating queued import:', error);
      return NextResponse.json({ error: 'Failed to update queued import' }, { status: 500 });
    }

    return NextResponse.json({ import: data });
  } catch (error: any) {
    console.error('Error in PUT /api/automatic-imports/queue/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update queued import' },
      { status: 500 }
    );
  }
}

