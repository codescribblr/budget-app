import { NextResponse } from 'next/server';
import { withExternalApiService, externalApiData } from '@/lib/external-api/handler';
import { getExternalDb } from '@/lib/external-api/query-helpers';

const FORECAST_SETTING_KEYS = [
  'forecast_age',
  'income_growth_rate',
  'savings_rate',
  'retirement_savings_rate',
  'repeatable_events',
  'timeline_events',
  'retirement_age',
  'social_security_start_age',
  'social_security_benefit_level',
  'other_retirement_income',
  'distribution_amount',
  'distribution_increase_rate',
  'distribution_type',
  'rmd_age',
  'inflation_rate',
];

export const GET = withExternalApiService('reports', async (_request, context) => {
  const supabase = getExternalDb();
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .eq('account_id', context.budgetAccountId)
    .in('key', FORECAST_SETTING_KEYS);

  if (error) throw error;

  const settings: Record<string, unknown> = {};
  (data ?? []).forEach((row) => {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  });

  return NextResponse.json(externalApiData(settings, context));
});

export const POST = withExternalApiService('reports', async (request, context) => {
  const body = await request.json();
  const supabase = getExternalDb();

  for (const [key, value] of Object.entries(body)) {
    if (!FORECAST_SETTING_KEYS.includes(key)) continue;
    const stored = typeof value === 'string' ? value : JSON.stringify(value);
    const { error } = await supabase.from('settings').upsert(
      {
        account_id: context.budgetAccountId,
        user_id: context.createdBy,
        key,
        value: stored,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,key' }
    );
    if (error) throw error;
  }

  return NextResponse.json(externalApiData({ success: true }, context));
});
