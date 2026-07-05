import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';

/**
 * GET /api/notifications/[id]
 * Get a specific notification (including archived)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const { id } = await params;

    const { data: notification, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', parseInt(id))
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ notification });
  } catch (error: any) {
    console.error('Error fetching notification:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch notification' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/[id]
 * Update a notification (mark read, archive, unarchive)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const { id } = await params;
    const body = await request.json();
    const { isRead, isArchived } = body as { isRead?: boolean; isArchived?: boolean };

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (isRead !== undefined) {
      updateData.is_read = isRead;
      updateData.read_at = isRead ? new Date().toISOString() : null;
    }

    if (isArchived !== undefined) {
      updateData.is_archived = isArchived;
      updateData.archived_at = isArchived ? new Date().toISOString() : null;
      if (isArchived) {
        updateData.is_read = true;
        updateData.read_at = new Date().toISOString();
      }
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .update(updateData)
      .eq('id', parseInt(id))
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ notification });
  } catch (error: any) {
    console.error('Error updating notification:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/[id]
 * Archive a notification (soft delete — history is retained)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const { id } = await params;
    const now = new Date().toISOString();

    const { data: archivedRows, error } = await supabase
      .from('notifications')
      .update({
        is_archived: true,
        archived_at: now,
        is_read: true,
        read_at: now,
        updated_at: now,
      })
      .eq('id', parseInt(id))
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .select('id');

    if (error) throw error;

    if (!archivedRows || archivedRows.length === 0) {
      const { data: existing } = await supabase
        .from('notifications')
        .select('id, is_archived')
        .eq('id', parseInt(id))
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existing) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }
      if (existing.is_archived) {
        return NextResponse.json({ success: true, archived: true });
      }
      return NextResponse.json(
        { error: 'Notification could not be archived' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, archived: true });
  } catch (error: any) {
    console.error('Error archiving notification:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to archive notification' },
      { status: 500 }
    );
  }
}
