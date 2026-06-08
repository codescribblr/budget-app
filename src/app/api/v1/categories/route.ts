import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import { ExternalApiValidationError } from '@/lib/external-api/query-helpers';

/**
 * GET /api/v1/categories
 */
export const GET = withExternalApi('categories', async (request, context) => {
  const supabase = createServiceRoleClient();
  const includeArchived = request.nextUrl.searchParams.get('includeArchived');

  let query = supabase
    .from('categories')
    .select('*')
    .eq('account_id', context.budgetAccountId);

  if (includeArchived === 'only') {
    query = query.eq('is_archived', true);
  } else if (includeArchived !== 'all') {
    query = query.or('is_archived.is.null,is_archived.eq.false');
  }

  const { data, error } = await query.order('sort_order');
  if (error) throw error;

  return NextResponse.json(externalApiData(data ?? [], context));
});

/**
 * POST /api/v1/categories
 */
export const POST = withExternalApi('categories', async (request, context) => {
  const body = await request.json();
  if (!body.name?.trim()) {
    throw new ExternalApiValidationError('name is required');
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('categories')
    .insert({
      account_id: context.budgetAccountId,
      user_id: context.createdBy,
      name: body.name.trim(),
      monthly_amount: body.monthly_amount ?? 0,
      current_balance: body.current_balance ?? 0,
      sort_order: body.sort_order ?? 0,
      notes: body.notes ?? null,
      is_system: false,
      is_archived: body.is_archived ?? false,
      category_type: body.category_type ?? 'monthly_expense',
      priority: body.priority ?? null,
      monthly_target: body.monthly_target ?? body.monthly_amount ?? null,
      annual_target: body.annual_target ?? null,
      target_balance: body.target_balance ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;

  return NextResponse.json(externalApiData(data, context), { status: 201 });
});
