import { NextResponse } from 'next/server';
import { withExternalApiService, externalApiData } from '@/lib/external-api/handler';
import { updateCategoriesOrder } from '@/lib/supabase-queries';
import { ExternalApiValidationError } from '@/lib/external-api/query-helpers';

export const PATCH = withExternalApiService('categories', async (request, context) => {
  const body = await request.json();
  const { categoryOrders } = body as {
    categoryOrders: Array<{ id: number; sort_order: number }>;
  };

  if (!Array.isArray(categoryOrders) || categoryOrders.length === 0) {
    throw new ExternalApiValidationError('categoryOrders must be a non-empty array');
  }

  for (const item of categoryOrders) {
    if (typeof item.id !== 'number' || typeof item.sort_order !== 'number') {
      throw new ExternalApiValidationError('Each item must have id and sort_order as numbers');
    }
  }

  await updateCategoriesOrder(categoryOrders);
  return NextResponse.json(
    externalApiData({ success: true, updated: categoryOrders.length }, context)
  );
});
