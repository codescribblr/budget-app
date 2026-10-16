import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin, requireAdmin } from '@/lib/admin';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import {
  extractBearerToken,
  getAdminApiKeyPrefix,
  verifyAdminApiKey,
} from './key-crypto';
import { AdminApiError } from './errors';
import type { AdminApiContext } from './types';

/**
 * Authenticate an /api/admin/v1 request.
 * Accepts Authorization: Bearer <admin_api_key> OR an admin browser session.
 */
export async function authenticateAdminV1Request(
  authorizationHeader: string | null
): Promise<AdminApiContext> {
  const token = extractBearerToken(authorizationHeader);

  if (token) {
    // Prefer API key when a Bearer token is present (even if a session cookie exists)
    if (token.startsWith('adm_')) {
      return authenticateWithAdminApiKey(token);
    }
    // Non-admin-key bearer: fall through to session if possible
  }

  // Optional session auth
  try {
    const { user } = await getAuthenticatedUser();
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      throw new AdminApiError(401, 'unauthorized', 'Admin access required');
    }
    return {
      mode: 'session',
      apiKeyId: null,
      apiKeyName: null,
      userId: user.id,
    };
  } catch (error) {
    if (error instanceof AdminApiError) throw error;
    if (token) {
      throw new AdminApiError(401, 'invalid_api_key', 'Invalid or expired admin API key');
    }
    throw new AdminApiError(401, 'unauthorized', 'Admin API key or admin session required');
  }
}

async function authenticateWithAdminApiKey(token: string): Promise<AdminApiContext> {
  const prefix = getAdminApiKeyPrefix(token);
  const supabase = createServiceRoleClient();
  const now = new Date();

  const { data: byCurrent, error: currentError } = await supabase
    .from('admin_api_keys')
    .select('*')
    .eq('key_prefix', prefix)
    .is('revoked_at', null);

  if (currentError) {
    console.error('[admin-api] key lookup error:', currentError);
    throw new AdminApiError(500, 'internal_error', 'Failed to authenticate');
  }

  let match =
    (byCurrent ?? []).find((row) => verifyAdminApiKey(token, row.key_hash)) ?? null;

  // Grace-period previous secret after rotation
  if (!match) {
    const { data: byPrevious, error: prevError } = await supabase
      .from('admin_api_keys')
      .select('*')
      .eq('previous_key_prefix', prefix)
      .is('revoked_at', null)
      .gt('previous_key_valid_until', now.toISOString());

    if (prevError) {
      console.error('[admin-api] previous key lookup error:', prevError);
      throw new AdminApiError(500, 'internal_error', 'Failed to authenticate');
    }

    match =
      (byPrevious ?? []).find(
        (row) =>
          row.previous_key_hash &&
          verifyAdminApiKey(token, row.previous_key_hash)
      ) ?? null;
  }

  if (!match) {
    throw new AdminApiError(401, 'invalid_api_key', 'Invalid or expired admin API key');
  }

  if (match.expires_at && new Date(match.expires_at) <= now) {
    throw new AdminApiError(401, 'invalid_api_key', 'Admin API key has expired');
  }

  // Best-effort last_used_at update
  void supabase
    .from('admin_api_keys')
    .update({ last_used_at: now.toISOString() })
    .eq('id', match.id);

  return {
    mode: 'api_key',
    apiKeyId: match.id,
    apiKeyName: match.name,
    userId: null,
  };
}

/** Session-only admin auth for key management UI routes. */
export async function requireAdminSession(): Promise<{ userId: string }> {
  const { user } = await requireAdmin();
  return { userId: user.id };
}
