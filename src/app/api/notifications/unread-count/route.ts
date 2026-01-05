import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications for the current user
 */
export async function GET() {
  try {
    const { user, supabase } = await getAuthenticatedUser();

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .eq('in_app_created', true);

    if (error) throw error;

    return NextResponse.json({ count: count || 0 });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch unread count' },
      { status: 500 }
    );
  }
}




