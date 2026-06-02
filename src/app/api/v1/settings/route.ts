import { NextRequest, NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import { ExternalApiValidationError, getExternalDb } from '@/lib/external-api/query-helpers';

export const GET = withExternalApi('settings', async (_request, context) => {
  const supabase = getExternalDb();
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('account_id', context.budgetAccountId);

  if (error) throw error;

  const settings: Record<string, string> = {};
  (data ?? []).forEach((row: { key: string; value: string }) => {
    settings[row.key] = row.value;
  });

  return NextResponse.json(externalApiData(settings, context));
});

export const POST = withExternalApi('settings', async (request, context) => {
  const body = await request.json();
  const settings = body.settings ?? body;

  if (!settings || typeof settings !== 'object') {
    throw new ExternalApiValidationError('settings object is required');
  }

  const supabase = getExternalDb();
  const entries = Array.isArray(settings)
    ? settings
    : Object.entries(settings).map(([key, value]) => ({ key, value: String(value) }));

  for (const setting of entries) {
    const { error } = await supabase.from('settings').upsert(
      {
        account_id: context.budgetAccountId,
        user_id: context.createdBy,
        key: setting.key,
        value: setting.value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,key' }
    );
    if (error) throw error;
  }

  return NextResponse.json(externalApiData({ success: true }, context));
});
