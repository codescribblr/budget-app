import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getUserNotificationPreferences } from '@/lib/notifications/helpers';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications/preferences
 * Get all notification preferences for the current user
 */
export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();
    const preferences = await getUserNotificationPreferences(user.id);

    return NextResponse.json({ preferences });
  } catch (error: any) {
    console.error('Error fetching notification preferences:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/preferences
 * Bulk update notification preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    const body = await request.json();
    const { preferences } = body as { preferences: Record<string, { emailEnabled?: boolean; inAppEnabled?: boolean; settings?: Record<string, any> }> };

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { error: 'Invalid preferences format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Update or insert preferences for each notification type
    const updates = Object.entries(preferences).map(async ([notificationTypeId, prefs]) => {
      const updateData: any = {
        user_id: user.id,
        notification_type_id: notificationTypeId,
        updated_at: new Date().toISOString(),
      };

      if (prefs.emailEnabled !== undefined) {
        updateData.email_enabled = prefs.emailEnabled;
      }
      if (prefs.inAppEnabled !== undefined) {
        updateData.in_app_enabled = prefs.inAppEnabled;
      }
      if (prefs.settings !== undefined) {
        updateData.settings = prefs.settings;
      }

      // Use upsert to insert or update
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert(updateData, {
          onConflict: 'user_id,notification_type_id',
        });

      if (error) throw error;
    });

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating notification preferences:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}




