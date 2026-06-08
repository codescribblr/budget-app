import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { NotificationService } from '@/lib/notifications/notification-service';
import { createClient } from '@/lib/supabase/server';

const service = new NotificationService();

/**
 * GET /api/notifications/preferences/[typeId]
 * Get preferences for a specific notification type
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ typeId: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser();
    const { typeId } = await params;

    const preferences = await service.getUserPreferences(user.id, typeId);

    return NextResponse.json({ preferences });
  } catch (error: any) {
    console.error('Error fetching notification preference:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch notification preference' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/preferences/[typeId]
 * Update preferences for a specific notification type
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ typeId: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser();
    const { typeId } = await params;
    const body = await request.json();
    const { emailEnabled, inAppEnabled, settings } = body as {
      emailEnabled?: boolean;
      inAppEnabled?: boolean;
      settings?: Record<string, any>;
    };

    const supabase = await createClient();

    const updateData: any = {
      user_id: user.id,
      notification_type_id: typeId,
      updated_at: new Date().toISOString(),
    };

    if (emailEnabled !== undefined) {
      updateData.email_enabled = emailEnabled;
    }
    if (inAppEnabled !== undefined) {
      updateData.in_app_enabled = inAppEnabled;
    }
    if (settings !== undefined) {
      updateData.settings = settings;
    }

    // Use upsert to insert or update
    const { error } = await supabase
      .from('user_notification_preferences')
      .upsert(updateData, {
        onConflict: 'user_id,notification_type_id',
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating notification preference:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to update notification preference' },
      { status: 500 }
    );
  }
}




