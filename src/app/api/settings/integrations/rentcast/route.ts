import { staleRowResponse, optionalDeleteBody } from "@/lib/row-precondition";
import { NextRequest, NextResponse } from 'next/server';
import { getActiveAccountId } from '@/lib/account-context';
import { checkOwnerAccess } from '@/lib/api-helpers';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import {
  buildApiKeyHint,
  encryptIntegrationApiKey,
  getRentCastIntegrationRow,
  toPublicRentCastIntegration,
} from '@/lib/integrations/rentcast/sync';
import { DEFAULT_RENTCAST_MONTHLY_LIMIT } from '@/lib/integrations/rentcast/types';

function normalizeConfigInput(config: unknown) {
  const input = (config ?? {}) as {
    enforce_monthly_limit?: boolean;
    monthly_request_limit?: number;
  };

  const monthlyRequestLimit =
    typeof input.monthly_request_limit === 'number' && input.monthly_request_limit > 0
      ? Math.min(Math.floor(input.monthly_request_limit), 1000)
      : DEFAULT_RENTCAST_MONTHLY_LIMIT;

  return {
    enforce_monthly_limit: input.enforce_monthly_limit ?? true,
    monthly_request_limit: monthlyRequestLimit,
  };
}

export async function GET() {
  try {
    const ownerCheck = await checkOwnerAccess();
    if (ownerCheck) return ownerCheck;

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { supabase } = await getAuthenticatedUser();
    const row = await getRentCastIntegrationRow(supabase, accountId);

    return NextResponse.json({
      integration: {...toPublicRentCastIntegration(row),account_id:accountId},
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching RentCast integration settings:', error);
    return NextResponse.json({ error: 'Failed to fetch integration settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ownerCheck = await checkOwnerAccess();
    if (ownerCheck) return ownerCheck;

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const body = await request.json();
    const { supabase } = await getAuthenticatedUser();
    const existing = await getRentCastIntegrationRow(supabase, accountId);

    const nextConfig = body.config !== undefined
      ? normalizeConfigInput({...(existing?.config??{}),...body.config})
      : normalizeConfigInput(existing?.config);

    const updatePayload: Record<string, unknown> = {
      account_id: accountId,
      integration_type: 'rentcast',
      config: nextConfig,
      updated_at: new Date().toISOString(),
    };

    if (typeof body.is_enabled === 'boolean') {
      updatePayload.is_enabled = body.is_enabled;
    } else if (existing) {
      updatePayload.is_enabled = existing.is_enabled;
    } else {
      updatePayload.is_enabled = false;
    }

    if (typeof body.api_key === 'string' && body.api_key.trim()) {
      updatePayload.encrypted_api_key = encryptIntegrationApiKey(body.api_key);
      updatePayload.api_key_hint = buildApiKeyHint(body.api_key);
    } else if (existing?.encrypted_api_key) {
      updatePayload.encrypted_api_key = existing.encrypted_api_key;
      updatePayload.api_key_hint = existing.api_key_hint;
    }

    if (updatePayload.is_enabled && !updatePayload.encrypted_api_key) {
      return NextResponse.json(
        { error: 'An API key is required to enable the RentCast integration' },
        { status: 400 }
      );
    }

    if("expectedRevision" in body || "expectedBudgetId" in body){
      if(body.expectedBudgetId!==accountId)return NextResponse.json({error:"The active budget changed."},{status:409});
      if(body.expectedRevision!==null && (typeof body.expectedRevision!=="string" || !/^[0-9a-f-]{36}$/i.test(body.expectedRevision)))return NextResponse.json({error:"Reload this integration before saving."},{status:400});
      const {account_id: ignoredAccount,integration_type: ignoredType,updated_at: ignoredTime,...patch}=updatePayload;
      const {data:saved,error}=await supabase.rpc('save_guarded_integration',{p_budget_id:accountId,p_revision:body.expectedRevision,p_patch:patch});
      if(error)throw error;
      if(saved.status==='conflict')return staleRowResponse();
      const row={...saved.record,encrypted_api_key:saved.record.has_api_key?"present":null};
      return NextResponse.json({integration:{...toPublicRentCastIntegration(row),account_id:accountId}});
    }

    const { data, error } = await supabase
      .from('integration_settings')
      .upsert(updatePayload, { onConflict: 'account_id,integration_type' })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({
      integration: toPublicRentCastIntegration(data),
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating RentCast integration settings:', error);
    return NextResponse.json({ error: 'Failed to update integration settings' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ownerCheck = await checkOwnerAccess();
    if (ownerCheck) return ownerCheck;

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { supabase } = await getAuthenticatedUser();

    const body=await optionalDeleteBody(request);
    if("expectedRevision" in body || "expectedBudgetId" in body){
      if(body.expectedBudgetId!==accountId)return NextResponse.json({error:"The active budget changed."},{status:409});
      const {data:saved,error}=await supabase.rpc('save_guarded_integration',{p_budget_id:accountId,p_revision:body.expectedRevision,p_patch:{},p_delete:true});
      if(error)throw error;
      if(saved.status==='conflict')return staleRowResponse();
      return NextResponse.json({success:true});
    }

    await supabase
      .from('integration_settings')
      .delete()
      .eq('account_id', accountId)
      .eq('integration_type', 'rentcast');

    await supabase
      .from('non_cash_assets')
      .update({
        rentcast_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', accountId)
      .eq('rentcast_enabled', true);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error removing RentCast integration:', error);
    return NextResponse.json({ error: 'Failed to remove integration' }, { status: 500 });
  }
}
