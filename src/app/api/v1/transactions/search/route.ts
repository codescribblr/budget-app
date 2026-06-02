import { NextResponse } from 'next/server';
import { withExternalApiService, externalApiData } from '@/lib/external-api/handler';
import { sanitizeSearchQuery } from '@/lib/external-api/search-sanitize';

export const GET = withExternalApiService('transactions', async (request, context) => {
  const { searchTransactions } = await import('@/lib/supabase-queries');
  const query = sanitizeSearchQuery(request.nextUrl.searchParams.get('q') || '');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10', 10);

  if (query.length < 3) {
    return NextResponse.json(externalApiData([], context));
  }

  const transactions = await searchTransactions(query, limit);
  return NextResponse.json(externalApiData(transactions, context));
});
