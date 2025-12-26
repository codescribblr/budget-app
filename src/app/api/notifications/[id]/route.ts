import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications/[id]
 * Get a specific notification
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
 * Update a notification (e.g., mark as read)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const { id } = await params;
    const body = await request.json();
    const { isRead } = body as { isRead?: boolean };

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (isRead !== undefined) {
      updateData.is_read = isRead;
      if (isRead) {
        updateData.read_at = new Date().toISOString();
      } else {
        updateData.read_at = null;
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
 * Delete a notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const { id } = await params;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', parseInt(id))
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}



