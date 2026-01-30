import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getAdminNotificationStats, syncAdminNotificationReadStatus } from '@/lib/admin-notifications';

/**
 * GET /api/admin/notifications/[id]/stats
 * Get statistics for an admin notification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const notificationId = parseInt(id);

    if (isNaN(notificationId)) {
      return NextResponse.json(
        { error: 'Invalid notification ID' },
        { status: 400 }
      );
    }

    // Sync read status first
    await syncAdminNotificationReadStatus(notificationId);

    const stats = await getAdminNotificationStats(notificationId);

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
