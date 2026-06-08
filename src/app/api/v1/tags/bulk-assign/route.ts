import { NextResponse } from 'next/server';
import { withExternalApiService, externalApiData } from '@/lib/external-api/handler';
import { bulkAssignTags } from '@/lib/db/tags';
import { ExternalApiValidationError } from '@/lib/external-api/query-helpers';

export const POST = withExternalApiService('tags', async (request, context) => {
  const body = await request.json();
  const transactionIds = body.transaction_ids ?? body.transactionIds;
  const tagIds = body.tag_ids ?? body.tagIds;

  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    throw new ExternalApiValidationError('transaction_ids must be a non-empty array');
  }
  if (!Array.isArray(tagIds) || tagIds.length === 0) {
    throw new ExternalApiValidationError('tag_ids must be a non-empty array');
  }

  const count = await bulkAssignTags(transactionIds, tagIds);
  return NextResponse.json(externalApiData({ success: true, updated_count: count }, context));
});
