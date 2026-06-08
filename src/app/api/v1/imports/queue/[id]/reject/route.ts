import { NextResponse } from 'next/server';
import { externalApiData } from '@/lib/external-api/handler';
import { externalApiIdRoute } from '@/lib/external-api/resource-routes';
import { updateQueuedImportStatus } from '@/lib/automatic-imports/queue-manager';

export const POST = externalApiIdRoute('imports', async (request, context, id) => {
  const body = await request.json().catch(() => ({}));
  await updateQueuedImportStatus(id, 'rejected', body.reviewNotes ?? body.review_notes);
  return NextResponse.json(externalApiData({ success: true }, context));
});
