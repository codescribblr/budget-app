import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  EXTERNAL_API_IDEMPOTENCY_TTL_HOURS,
  IDEMPOTENCY_HEADER,
  MAX_IDEMPOTENCY_KEY_LENGTH,
} from './constants';
import { ExternalApiValidationError } from './query-helpers';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH']);

export function getIdempotencyKey(request: Request): string | null {
  const key = request.headers.get(IDEMPOTENCY_HEADER)?.trim();
  return key || null;
}

export function assertValidIdempotencyKey(key: string): void {
  if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw new ExternalApiValidationError(
      `Idempotency-Key must be at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`
    );
  }
}

export async function getCachedIdempotentResponse(
  apiKeyId: string,
  idempotencyKey: string,
  method: string,
  path: string
): Promise<NextResponse | null> {
  const supabase = createServiceRoleClient();
  const minCreatedAt = new Date(
    Date.now() - EXTERNAL_API_IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from('api_key_idempotency')
    .select('status_code, response_body, method, path')
    .eq('api_key_id', apiKeyId)
    .eq('idempotency_key', idempotencyKey)
    .gte('created_at', minCreatedAt)
    .maybeSingle();

  if (error) {
    console.error('Error fetching idempotency record:', error);
    return null;
  }

  if (!data) return null;

  if (data.method !== method || data.path !== path) {
    throw new ExternalApiValidationError(
      'Idempotency-Key was already used for a different request'
    );
  }

  return NextResponse.json(data.response_body, { status: data.status_code });
}

export async function storeIdempotentResponse(
  apiKeyId: string,
  idempotencyKey: string,
  method: string,
  path: string,
  statusCode: number,
  responseBody: unknown
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    await supabase.from('api_key_idempotency').insert({
      api_key_id: apiKeyId,
      idempotency_key: idempotencyKey,
      method,
      path,
      status_code: statusCode,
      response_body: responseBody,
    });
  } catch (error) {
    // Duplicate key from concurrent requests — safe to ignore; first write wins
    console.error('Failed to store idempotency record:', error);
  }
}

export function isWriteMethod(method: string): boolean {
  return WRITE_METHODS.has(method.toUpperCase());
}

export async function cleanupIdempotencyRecords(retentionHours = EXTERNAL_API_IDEMPOTENCY_TTL_HOURS): Promise<number> {
  const supabase = createServiceRoleClient();
  const cutoff = new Date(Date.now() - retentionHours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('api_key_idempotency')
    .delete()
    .lt('created_at', cutoff)
    .select('id');

  if (error) throw error;
  return data?.length ?? 0;
}
