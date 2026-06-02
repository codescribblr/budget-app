import { NextRequest, NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import type { ExternalApiContext } from '@/lib/external-api/types';
import type { ApiScopeSection } from '@/lib/external-api/types';
import {
  deleteByAccountId,
  getByAccountId,
  getExternalDb,
  listByAccountId,
  parseIdParam,
} from '@/lib/external-api/query-helpers';

export function externalApiIdRoute(
  section: ApiScopeSection,
  handler: (request: NextRequest, context: ExternalApiContext, id: number) => Promise<NextResponse>
) {
  return async (request: NextRequest, routeContext: { params: Promise<{ id: string }> }) => {
    const { id: idParam } = await routeContext.params;
    const id = parseIdParam(idParam);
    return withExternalApi(section, (req, ctx) => handler(req, ctx, id))(request);
  };
}

export function createListHandlers(
  section: ApiScopeSection,
  table: string,
  accountColumn: string,
  options?: { orderBy?: string; ascending?: boolean }
) {
  return {
    GET: withExternalApi(section, async (_request, context) => {
      const data = await listByAccountId(table, accountColumn, context.budgetAccountId, options);
      return NextResponse.json(externalApiData(data, context));
    }),
  };
}

export function createCrudHandlers(
  section: ApiScopeSection,
  table: string,
  accountColumn: string,
  options?: {
    orderBy?: string;
    ascending?: boolean;
    validateCreate?: (body: Record<string, unknown>) => void;
    mapCreate?: (body: Record<string, unknown>, context: ExternalApiContext) => Record<string, unknown>;
  }
) {
  return {
    GET: withExternalApi(section, async (_request, context) => {
      const data = await listByAccountId(table, accountColumn, context.budgetAccountId, {
        orderBy: options?.orderBy,
        ascending: options?.ascending,
      });
      return NextResponse.json(externalApiData(data, context));
    }),
    POST: withExternalApi(section, async (request, context) => {
      const body = await request.json();
      options?.validateCreate?.(body);
      const payload = options?.mapCreate?.(body, context) ?? {
        ...body,
        [accountColumn]: context.budgetAccountId,
        user_id: context.createdBy,
      };

      const supabase = getExternalDb();
      const { data, error } = await supabase.from(table).insert(payload).select('*').single();
      if (error) throw error;
      return NextResponse.json(externalApiData(data, context), { status: 201 });
    }),
  };
}

export function createIdCrudHandlers(
  section: ApiScopeSection,
  table: string,
  accountColumn: string
) {
  return {
    GET: externalApiIdRoute(section, async (_request, context, id) => {
      const data = await getByAccountId(table, accountColumn, context.budgetAccountId, id);
      return NextResponse.json(externalApiData(data, context));
    }),
    PATCH: externalApiIdRoute(section, async (request, context, id) => {
      await getByAccountId(table, accountColumn, context.budgetAccountId, id);
      const body = await request.json();
      const {
        id: _id,
        account_id,
        budget_account_id,
        user_id,
        created_at,
        ...updates
      } = body;

      const supabase = getExternalDb();
      const { data, error } = await supabase
        .from(table)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq(accountColumn, context.budgetAccountId)
        .select('*')
        .single();

      if (error) throw error;
      return NextResponse.json(externalApiData(data, context));
    }),
    DELETE: externalApiIdRoute(section, async (_request, context, id) => {
      await deleteByAccountId(table, accountColumn, context.budgetAccountId, id);
      return NextResponse.json(externalApiData({ success: true }, context));
    }),
  };
}
