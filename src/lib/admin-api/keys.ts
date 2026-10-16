import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  generateAdminApiKeySecret,
  getAdminApiKeyPrefix,
  hashAdminApiKey,
} from './key-crypto';
import { AdminApiError } from './errors';
import type { AdminApiKeyListItem } from './types';

function deriveStatus(row: {
  revoked_at: string | null;
  expires_at: string | null;
  previous_key_valid_until: string | null;
}): AdminApiKeyListItem['status'] {
  const now = Date.now();
  if (row.revoked_at) return 'revoked';
  if (row.expires_at && new Date(row.expires_at).getTime() <= now) return 'expired';
  if (
    row.previous_key_valid_until &&
    new Date(row.previous_key_valid_until).getTime() > now
  ) {
    return 'grace';
  }
  return 'active';
}

export function toAdminApiKeyListItem(
  row: Record<string, unknown>,
  createdByEmail?: string | null
): AdminApiKeyListItem {
  const item = {
    id: row.id as string,
    name: row.name as string,
    key_prefix: row.key_prefix as string,
    created_by: row.created_by as string,
    created_by_email: createdByEmail ?? null,
    created_at: row.created_at as string,
    expires_at: (row.expires_at as string | null) ?? null,
    last_used_at: (row.last_used_at as string | null) ?? null,
    revoked_at: (row.revoked_at as string | null) ?? null,
    previous_key_valid_until: (row.previous_key_valid_until as string | null) ?? null,
    status: deriveStatus({
      revoked_at: (row.revoked_at as string | null) ?? null,
      expires_at: (row.expires_at as string | null) ?? null,
      previous_key_valid_until: (row.previous_key_valid_until as string | null) ?? null,
    }),
  };
  return item;
}

export async function listAdminApiKeys(): Promise<AdminApiKeyListItem[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('admin_api_keys')
    .select(
      'id, name, key_prefix, created_by, created_at, expires_at, last_used_at, revoked_at, previous_key_valid_until'
    )
    .order('created_at', { ascending: false });

  if (error) throw error;

  const creatorIds = [...new Set((data ?? []).map((r) => r.created_by).filter(Boolean))];
  const emailById = new Map<string, string>();
  if (creatorIds.length > 0) {
    try {
      const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      for (const u of users?.users ?? []) {
        if (creatorIds.includes(u.id) && u.email) {
          emailById.set(u.id, u.email);
        }
      }
    } catch (error) {
      console.error('[admin-api] failed to resolve creator emails:', error);
    }
  }

  return (data ?? []).map((row) =>
    toAdminApiKeyListItem(row, emailById.get(row.created_by) ?? null)
  );
}

export async function createAdminApiKey(input: {
  name: string;
  createdBy: string;
  expiresAt?: string | null;
}): Promise<{ key: AdminApiKeyListItem; secret: string }> {
  const name = input.name.trim();
  if (!name) {
    throw new AdminApiError(400, 'validation_error', 'Name is required');
  }

  let expiresAt: string | null = null;
  if (input.expiresAt) {
    const parsed = new Date(input.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new AdminApiError(400, 'validation_error', 'Invalid expires_at');
    }
    if (parsed <= new Date()) {
      throw new AdminApiError(400, 'validation_error', 'expires_at must be in the future');
    }
    expiresAt = parsed.toISOString();
  }

  const secret = generateAdminApiKeySecret();
  const keyPrefix = getAdminApiKeyPrefix(secret);
  const keyHash = hashAdminApiKey(secret);

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('admin_api_keys')
    .insert({
      name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      created_by: input.createdBy,
      expires_at: expiresAt,
    })
    .select(
      'id, name, key_prefix, created_by, created_at, expires_at, last_used_at, revoked_at, previous_key_valid_until'
    )
    .single();

  if (error) throw error;

  return { key: toAdminApiKeyListItem(data), secret };
}

export async function revokeAdminApiKey(id: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data: existing, error: fetchError } = await supabase
    .from('admin_api_keys')
    .select('id, revoked_at')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) {
    throw new AdminApiError(404, 'not_found', 'API key not found');
  }
  if (existing.revoked_at) {
    throw new AdminApiError(400, 'validation_error', 'API key already revoked');
  }

  const { error } = await supabase
    .from('admin_api_keys')
    .update({
      revoked_at: new Date().toISOString(),
      previous_key_hash: null,
      previous_key_prefix: null,
      previous_key_valid_until: null,
    })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Rotate secret. Optionally keep the old secret valid until grace_seconds from now.
 */
export async function rotateAdminApiKey(
  id: string,
  options?: { grace_seconds?: number }
): Promise<{ key: AdminApiKeyListItem; secret: string }> {
  const supabase = createServiceRoleClient();
  const { data: existing, error: fetchError } = await supabase
    .from('admin_api_keys')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) {
    throw new AdminApiError(404, 'not_found', 'API key not found');
  }
  if (existing.revoked_at) {
    throw new AdminApiError(400, 'validation_error', 'Cannot rotate a revoked key');
  }
  if (existing.expires_at && new Date(existing.expires_at) <= new Date()) {
    throw new AdminApiError(400, 'validation_error', 'Cannot rotate an expired key');
  }

  const graceSeconds =
    typeof options?.grace_seconds === 'number' && options.grace_seconds > 0
      ? Math.min(options.grace_seconds, 60 * 60 * 24 * 30) // max 30 days
      : 0;

  const secret = generateAdminApiKeySecret();
  const keyPrefix = getAdminApiKeyPrefix(secret);
  const keyHash = hashAdminApiKey(secret);

  const update: Record<string, unknown> = {
    key_prefix: keyPrefix,
    key_hash: keyHash,
  };

  if (graceSeconds > 0) {
    update.previous_key_prefix = existing.key_prefix;
    update.previous_key_hash = existing.key_hash;
    update.previous_key_valid_until = new Date(
      Date.now() + graceSeconds * 1000
    ).toISOString();
  } else {
    update.previous_key_prefix = null;
    update.previous_key_hash = null;
    update.previous_key_valid_until = null;
  }

  const { data, error } = await supabase
    .from('admin_api_keys')
    .update(update)
    .eq('id', id)
    .select(
      'id, name, key_prefix, created_by, created_at, expires_at, last_used_at, revoked_at, previous_key_valid_until'
    )
    .single();

  if (error) throw error;

  return { key: toAdminApiKeyListItem(data), secret };
}
