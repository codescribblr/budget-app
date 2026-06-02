import { NextResponse } from 'next/server';
import { externalApiData } from '@/lib/external-api/handler';
import { externalApiIdRoute } from '@/lib/external-api/resource-routes';
import { ExternalApiNotFoundError, getExternalDb } from '@/lib/external-api/query-helpers';

export const GET = externalApiIdRoute('imports', async (_request, context, id) => {
  const supabase = getExternalDb();
  const { data, error } = await supabase
    .from('queued_imports')
    .select('*')
    .eq('id', id)
    .eq('account_id', context.budgetAccountId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new ExternalApiNotFoundError('Queued import not found');

  return NextResponse.json(externalApiData(data, context));
});

export const PATCH = externalApiIdRoute('imports', async (request, context, id) => {
  const body = await request.json();
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.is_historical !== undefined) updateData.is_historical = body.is_historical;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.review_notes !== undefined) updateData.review_notes = body.review_notes;
  if (body.suggested_category_id !== undefined) {
    updateData.suggested_category_id = body.suggested_category_id;
  }

  const supabase = getExternalDb();
  const { data, error } = await supabase
    .from('queued_imports')
    .update(updateData)
    .eq('id', id)
    .eq('account_id', context.budgetAccountId)
    .select('*')
    .single();

  if (error) throw error;
  return NextResponse.json(externalApiData(data, context));
});
