import { NextResponse } from 'next/server';
import { withExternalApiService, externalApiData } from '@/lib/external-api/handler';
import { ExternalApiValidationError } from '@/lib/external-api/query-helpers';
import { approveAndImportQueuedTransactions } from '@/lib/automatic-imports/queue-manager';
import { externalApiIdRoute } from '@/lib/external-api/resource-routes';

export const POST = externalApiIdRoute('imports', async (request, context, id) => {
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids)
    ? body.ids.map((value: unknown) => parseInt(String(value), 10)).filter((n: number) => !Number.isNaN(n))
    : [id];

  if (ids.length === 0) {
    throw new ExternalApiValidationError('No valid queued import IDs provided');
  }

  const result = await approveAndImportQueuedTransactions(ids, body.transactionsWithSplits);
  return NextResponse.json(externalApiData(result, context));
});
