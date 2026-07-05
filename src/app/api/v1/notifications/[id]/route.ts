import { NextResponse } from 'next/server';
import { externalApiData } from '@/lib/external-api/handler';
import { externalApiIdRoute } from '@/lib/external-api/resource-routes';
import { ExternalApiNotFoundError, getExternalDb } from '@/lib/external-api/query-helpers';

export const GET = externalApiIdRoute('notifications', async (_request, context, id) => {
  const supabase = getExternalDb();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', id)
    .eq('budget_account_id', context.budgetAccountId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new ExternalApiNotFoundError('Notification not found');

  return NextResponse.json(externalApiData(data, context));
});

export const PATCH = externalApiIdRoute('notifications', async (request, context, id) => {
  const body = await request.json();
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.isRead !== undefined) {
    updateData.is_read = body.isRead;
    updateData.read_at = body.isRead ? new Date().toISOString() : null;
  }

  if (body.isArchived !== undefined) {
    updateData.is_archived = body.isArchived;
    updateData.archived_at = body.isArchived ? new Date().toISOString() : null;
    if (body.isArchived) {
      updateData.is_read = true;
      updateData.read_at = new Date().toISOString();
    }
  }

  const supabase = getExternalDb();
  const { data, error } = await supabase
    .from('notifications')
    .update(updateData)
    .eq('id', id)
    .eq('budget_account_id', context.budgetAccountId)
    .select('*')
    .single();

  if (error) throw error;
  return NextResponse.json(externalApiData(data, context));
});

export const DELETE = externalApiIdRoute('notifications', async (_request, context, id) => {
  const supabase = getExternalDb();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('notifications')
    .update({
      is_archived: true,
      archived_at: now,
      is_read: true,
      read_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .eq('budget_account_id', context.budgetAccountId)
    .eq('is_archived', false)
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new ExternalApiNotFoundError('Notification not found');
  }
  return NextResponse.json(externalApiData({ success: true, archived: true }, context));
});
