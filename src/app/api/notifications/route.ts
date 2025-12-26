import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications
 * Get notifications for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type');
    const isRead = searchParams.get('isRead');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('notification_type_id', type);
    }

    if (isRead !== null) {
      query = query.eq('is_read', isRead === 'true');
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    return NextResponse.json({ notifications: notifications || [] });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}



