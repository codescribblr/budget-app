import { NextResponse } from 'next/server';
import { withExternalApiService, externalApiData } from '@/lib/external-api/handler';
import { getDashboardSummary } from '@/lib/supabase-queries';

export const GET = withExternalApiService('reports', async (_request, context) => {
  const summary = await getDashboardSummary();
  return NextResponse.json(externalApiData(summary, context));
});
