import { NextResponse } from 'next/server';
import { withExternalApiService, externalApiData } from '@/lib/external-api/handler';
import { setCategoriesArchived } from '@/lib/supabase-queries';
import { ExternalApiValidationError } from '@/lib/external-api/query-helpers';

export const PATCH = withExternalApiService('categories', async (request, context) => {
  const body = await request.json();
  const { categoryIds, is_archived } = body;

  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    throw new ExternalApiValidationError('categoryIds must be a non-empty array');
  }
  if (typeof is_archived !== 'boolean') {
    throw new ExternalApiValidationError('is_archived must be a boolean');
  }

  const updated = await setCategoriesArchived(categoryIds, is_archived);
  return NextResponse.json(externalApiData(updated, context));
});
