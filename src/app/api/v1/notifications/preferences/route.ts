import { NextResponse } from 'next/server';
import { withExternalApiService, externalApiData } from '@/lib/external-api/handler';
import { getUserNotificationPreferences } from '@/lib/notifications/helpers';
import { getExternalDb } from '@/lib/external-api/query-helpers';
import { ExternalApiValidationError } from '@/lib/external-api/query-helpers';

export const GET = withExternalApiService('notifications', async (_request, context) => {
  const preferences = await getUserNotificationPreferences(context.createdBy);
  return NextResponse.json(externalApiData(preferences, context));
});

export const PATCH = withExternalApiService('notifications', async (request, context) => {
  const body = await request.json();
  const preferences = body.preferences;

  if (!preferences || typeof preferences !== 'object') {
    throw new ExternalApiValidationError('preferences object is required');
  }

  const supabase = getExternalDb();
  const updates = Object.entries(preferences).map(async ([notificationTypeId, prefs]) => {
    const updateData: Record<string, unknown> = {
      user_id: context.createdBy,
      notification_type_id: notificationTypeId,
      updated_at: new Date().toISOString(),
    };
    const p = prefs as Record<string, unknown>;
    if (p.emailEnabled !== undefined) updateData.email_enabled = p.emailEnabled;
    if (p.inAppEnabled !== undefined) updateData.in_app_enabled = p.inAppEnabled;
    if (p.settings !== undefined) updateData.settings = p.settings;

    const { error } = await supabase.from('user_notification_preferences').upsert(updateData, {
      onConflict: 'user_id,notification_type_id',
    });
    if (error) throw error;
  });

  await Promise.all(updates);
  return NextResponse.json(externalApiData({ success: true }, context));
});
