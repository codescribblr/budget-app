import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import {
  createAdminNotification,
  listAdminNotifications,
  type CreateAdminNotificationData,
} from '@/lib/admin-notifications';

/**
 * GET /api/admin/notifications
 * List all admin notifications
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') as 'draft' | 'sent' | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const notifications = await listAdminNotifications({
      status: status || undefined,
      limit,
      offset,
    });

    return NextResponse.json({ notifications });
  } catch (error: any) {
    console.error('Error listing admin notifications:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to list admin notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/notifications
 * Create a new admin notification (draft)
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAdmin();
    const body = await request.json();

    const data: CreateAdminNotificationData = {
      title: body.title,
      content: body.content,
      pushTitle: body.pushTitle || null,
      pushBody: body.pushBody || null,
      targetType: body.targetType,
      targetId: body.targetId || null,
    };

    // Validation
    if (!data.title || !data.content || !data.targetType) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content, targetType' },
        { status: 400 }
      );
    }

    if (data.targetType !== 'global' && !data.targetId) {
      return NextResponse.json(
        { error: 'targetId is required for account and user targets' },
        { status: 400 }
      );
    }

    const id = await createAdminNotification(user.id, data);

    return NextResponse.json({ id }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating admin notification:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to create admin notification' },
      { status: 500 }
    );
  }
}
