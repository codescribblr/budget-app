import { NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import { getExternalDb } from '@/lib/external-api/query-helpers';

export const GET = withExternalApi('settings', async (_request, context) => {
  const supabase = getExternalDb();
  const { data, error } = await supabase
    .from('user_feature_flags')
    .select('feature_name, enabled')
    .eq('account_id', context.budgetAccountId);

  if (error) throw error;

  const flags: Record<string, boolean> = {};
  (data ?? []).forEach((row) => {
    flags[row.feature_name] = row.enabled;
  });

  return NextResponse.json(externalApiData(flags, context));
});
