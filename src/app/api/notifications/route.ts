import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/**
 * GET /api/notifications
 * Get notifications for the current user
 * Query params:
 *   - archived: 'true' for archived history, omitted/false for active inbox
 *   - isRead: filter by read state
 *   - type: notification type id
 *   - limit, offset: pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type');
    const isRead = searchParams.get('isRead');
    const archived = searchParams.get('archived') === 'true';
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('in_app_created', true)
      .eq('is_archived', archived);

    if (type) {
      query = query.eq('notification_type_id', type);
    }

    if (isRead !== null) {
      query = query.eq('is_read', isRead === 'true');
    }

    if (archived) {
      query = query.order('archived_at', { ascending: false, nullsFirst: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data: notifications, error, count } = await query;

    if (error) throw error;

    const total = count ?? 0;

    return NextResponse.json({
      notifications: notifications || [],
      total,
      limit,
      offset,
      hasMore: offset + (notifications?.length || 0) < total,
    });
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
