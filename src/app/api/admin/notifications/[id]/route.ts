import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import {
  getAdminNotification,
  updateAdminNotification,
  deleteAdminNotification,
  type CreateAdminNotificationData,
} from '@/lib/admin-notifications';

/**
 * GET /api/admin/notifications/[id]
 * Get a single admin notification
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

    const notification = await getAdminNotification(notificationId);

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ notification });
  } catch (error: any) {
    console.error('Error fetching admin notification:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch admin notification' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/notifications/[id]
 * Update an admin notification
 */
export async function PATCH(
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

    const body = await request.json();
    const updateData: Partial<CreateAdminNotificationData> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.pushTitle !== undefined) updateData.pushTitle = body.pushTitle;
    if (body.pushBody !== undefined) updateData.pushBody = body.pushBody;
    if (body.targetType !== undefined) updateData.targetType = body.targetType;
    if (body.targetId !== undefined) updateData.targetId = body.targetId;

    // Check if notification exists and is draft
    const existing = await getAdminNotification(notificationId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    if (existing.status === 'sent') {
      return NextResponse.json(
        { error: 'Cannot update a notification that has been sent' },
        { status: 400 }
      );
    }

    await updateAdminNotification(notificationId, updateData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating admin notification:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to update admin notification' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/notifications/[id]
 * Delete an admin notification (only if draft)
 */
export async function DELETE(
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

    await deleteAdminNotification(notificationId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting admin notification:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message.includes('Cannot delete')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to delete admin notification' },
      { status: 500 }
    );
  }
}
