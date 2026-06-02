import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkOwnerAccess } from '@/lib/api-helpers';
import { requirePremiumSubscription, PremiumRequiredError } from '@/lib/subscription-utils';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  generateApiKeySecret,
  getKeyPrefix,
  hashApiKey,
} from '@/lib/external-api/key-crypto';
import {
  ALL_API_SCOPES,
  API_SCOPE_PRESETS,
  API_SCOPE_SECTIONS,
  normalizePermissions,
} from '@/lib/external-api/scopes';
import { isExternalApiAccessEnabled } from '@/lib/external-api/auth';
import type { ApiKeyListItem, CreateApiKeyRequest } from '@/lib/external-api/types';
import { EXTERNAL_API_PREMIUM_DISABLED_MESSAGE } from '@/lib/external-api/constants';

function toListItem(row: Record<string, unknown>): ApiKeyListItem {
  return {
    id: row.id as string,
    name: row.name as string,
    key_prefix: row.key_prefix as string,
    permissions: (row.permissions ?? []) as ApiKeyListItem['permissions'],
    expires_at: (row.expires_at as string | null) ?? null,
    last_used_at: (row.last_used_at as string | null) ?? null,
    revoked_at: (row.revoked_at as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

/**
 * GET /api/settings/api-keys
 * List API keys for the active account (owner only, premium required)
 */
export async function GET() {
  try {
    const ownerCheck = await checkOwnerAccess();
    if (ownerCheck) return ownerCheck;

    const accountId = await getActiveAccountId();
    const apiAccessEnabled = accountId ? await isExternalApiAccessEnabled(accountId) : false;

    const { supabase } = await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, permissions, expires_at, last_used_at, revoked_at, created_at')
      .eq('budget_account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      keys: (data ?? []).map(toListItem),
      scopes: API_SCOPE_SECTIONS,
      presets: API_SCOPE_PRESETS,
      allScopes: ALL_API_SCOPES,
      apiAccessEnabled,
      apiDisabledMessage: apiAccessEnabled ? null : EXTERNAL_API_PREMIUM_DISABLED_MESSAGE,
    });
  } catch (error) {
    if (error instanceof PremiumRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error listing API keys:', error);
    return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 });
  }
}

/**
 * POST /api/settings/api-keys
 * Create a new API key (owner only, premium required)
 */
export async function POST(request: NextRequest) {
  try {
    const ownerCheck = await checkOwnerAccess();
    if (ownerCheck) return ownerCheck;

    const { user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    await requirePremiumSubscription(accountId);

    const body = (await request.json()) as CreateApiKeyRequest;
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!Array.isArray(body.permissions) || body.permissions.length === 0) {
      return NextResponse.json({ error: 'At least one permission scope is required' }, { status: 400 });
    }

    let permissions;
    try {
      permissions = normalizePermissions(body.permissions);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }

    let expiresAt: string | null = null;
    if (body.expires_at) {
      const parsed = new Date(body.expires_at);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid expires_at date' }, { status: 400 });
      }
      if (parsed <= new Date()) {
        return NextResponse.json({ error: 'expires_at must be in the future' }, { status: 400 });
      }
      expiresAt = parsed.toISOString();
    }

    const secret = generateApiKeySecret();
    const keyPrefix = getKeyPrefix(secret);
    const keyHash = hashApiKey(secret);

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        budget_account_id: accountId,
        created_by: user.id,
        name: body.name.trim(),
        key_prefix: keyPrefix,
        key_hash: keyHash,
        permissions,
        expires_at: expiresAt,
      })
      .select('id, name, key_prefix, permissions, expires_at, last_used_at, revoked_at, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        key: toListItem(data),
        secret,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof PremiumRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}
