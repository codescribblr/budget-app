import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { sendAdminNotification } from '@/lib/admin-notifications';

/**
 * POST /api/admin/notifications/[id]/send
 * Send an admin notification to all target recipients
 */
export async function POST(
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

    const result = await sendAdminNotification(notificationId);

    return NextResponse.json({ 
      success: true,
      ...result 
    });
  } catch (error: any) {
    console.error('Error sending admin notification:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message.includes('already been sent')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to send admin notification' },
      { status: 500 }
    );
  }
}
