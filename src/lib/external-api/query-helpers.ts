import { createServiceRoleClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExternalApiContext } from './types';

export class ExternalApiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExternalApiValidationError';
  }
}

export class ExternalApiNotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'ExternalApiNotFoundError';
  }
}

export function getExternalDb(): SupabaseClient {
  return createServiceRoleClient();
}

export function parseIdParam(value: string, label = 'ID'): number {
  const id = parseInt(value, 10);
  if (Number.isNaN(id)) {
    throw new ExternalApiValidationError(`Invalid ${label}`);
  }
  return id;
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(
    200,
    Math.max(1, parseInt(searchParams.get('pageSize') ?? '50', 10) || 50)
  );
  return { page, pageSize, from: (page - 1) * pageSize, to: (page - 1) * pageSize + pageSize - 1 };
}

export async function listByAccountId(
  table: string,
  accountColumn: string,
  accountId: number,
  options?: {
    orderBy?: string;
    ascending?: boolean;
    select?: string;
    filters?: Record<string, string | number | boolean | null>;
  }
) {
  const supabase = getExternalDb();
  let query = supabase
    .from(table)
    .select(options?.select ?? '*')
    .eq(accountColumn, accountId);

  if (options?.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      if (value === null) {
        query = query.is(key, null);
      } else {
        query = query.eq(key, value);
      }
    }
  }

  if (options?.orderBy) {
    query = query.order(options.orderBy, { ascending: options.ascending ?? true });
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getByAccountId(
  table: string,
  accountColumn: string,
  accountId: number,
  id: number,
  idColumn = 'id'
) {
  const supabase = getExternalDb();
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq(idColumn, id)
    .eq(accountColumn, accountId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new ExternalApiNotFoundError();
  return data;
}

export async function deleteByAccountId(
  table: string,
  accountColumn: string,
  accountId: number,
  id: number,
  idColumn = 'id'
) {
  await getByAccountId(table, accountColumn, accountId, id, idColumn);
  const supabase = getExternalDb();
  const { error } = await supabase.from(table).delete().eq(idColumn, id).eq(accountColumn, accountId);
  if (error) throw error;
}

export function accountScope(context: ExternalApiContext) {
  return {
    accountId: context.budgetAccountId,
    userId: context.createdBy,
  };
}
