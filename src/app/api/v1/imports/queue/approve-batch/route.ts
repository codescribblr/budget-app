import { NextResponse } from 'next/server';
import { withExternalApiService, externalApiData } from '@/lib/external-api/handler';
import { ExternalApiValidationError } from '@/lib/external-api/query-helpers';
import { approveAndImportQueuedTransactions } from '@/lib/automatic-imports/queue-manager';

export const POST = withExternalApiService('imports', async (request, context) => {
  const body = await request.json();
  const ids = Array.isArray(body.ids)
    ? body.ids.map((value: unknown) => parseInt(String(value), 10)).filter((n: number) => !Number.isNaN(n))
    : [];

  if (ids.length === 0) {
    throw new ExternalApiValidationError('ids array is required');
  }

  const result = await approveAndImportQueuedTransactions(ids, body.transactionsWithSplits);
  return NextResponse.json(externalApiData(result, context));
});
