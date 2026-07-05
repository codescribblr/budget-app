import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';

/**
 * POST /api/notifications/mark-all-read
 * Mark all unread in-app notifications as read for the current user
 */
export async function POST() {
  try {
    const { user, supabase } = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .eq('is_archived', false)
      .eq('in_app_created', true)
      .select('id');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      markedRead: data?.length || 0,
    });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}
