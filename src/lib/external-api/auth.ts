import { createServiceRoleClient } from '@/lib/supabase/server';
import { isPremiumUser, PremiumRequiredError } from '@/lib/subscription-utils';
import type { ExternalApiContext } from './types';
import { InvalidApiKeyError } from './scopes';
import { extractBearerToken, getKeyPrefix, verifyApiKey } from './key-crypto';
import type { ApiScope } from './types';
import { EXTERNAL_API_PREMIUM_DISABLED_MESSAGE } from './constants';

export async function authenticateApiKeyRequest(
  authorizationHeader: string | null
): Promise<ExternalApiContext> {
  const token = extractBearerToken(authorizationHeader);
  if (!token) {
    throw new InvalidApiKeyError('Missing Bearer token');
  }

  const prefix = getKeyPrefix(token);
  const supabase = createServiceRoleClient();

  const { data: candidates, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_prefix', prefix)
    .is('revoked_at', null);

  if (error) {
    console.error('Error looking up API key:', error);
    throw new InvalidApiKeyError();
  }

  const keyRecord = (candidates ?? []).find((candidate) => verifyApiKey(token, candidate.key_hash));
  if (!keyRecord) {
    throw new InvalidApiKeyError();
  }

  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    throw new InvalidApiKeyError('API key has expired');
  }

  await requirePremiumAccount(keyRecord.budget_account_id);

  // Update last_used_at asynchronously (best effort)
  void supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', keyRecord.id);

  return {
    apiKeyId: keyRecord.id,
    budgetAccountId: keyRecord.budget_account_id,
    createdBy: keyRecord.created_by,
    permissions: (keyRecord.permissions ?? []) as ApiScope[],
    keyName: keyRecord.name,
  };
}

export async function requirePremiumAccount(accountId: number): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data: subscription, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching subscription for external API:', error);
    throw new PremiumRequiredError(EXTERNAL_API_PREMIUM_DISABLED_MESSAGE);
  }

  if (!isPremiumUser(subscription)) {
    throw new PremiumRequiredError(EXTERNAL_API_PREMIUM_DISABLED_MESSAGE);
  }
}

export async function isExternalApiAccessEnabled(accountId: number): Promise<boolean> {
  try {
    await requirePremiumAccount(accountId);
    return true;
  } catch {
    return false;
  }
}

export async function cleanupApiKeyUsageLogs(retentionDays = 90): Promise<number> {
  const supabase = createServiceRoleClient();
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from('api_key_usage_log')
    .delete()
    .lt('created_at', cutoff)
    .select('id');

  if (error) throw error;
  return data?.length ?? 0;
}

export async function logApiKeyUsage(params: {
  apiKeyId: string;
  method: string;
  path: string;
  scopeUsed: string | null;
  statusCode: number;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    await supabase.from('api_key_usage_log').insert({
      api_key_id: params.apiKeyId,
      method: params.method,
      path: params.path,
      scope_used: params.scopeUsed,
      status_code: params.statusCode,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
    });
  } catch (error) {
    console.error('Failed to log API key usage:', error);
  }
}
