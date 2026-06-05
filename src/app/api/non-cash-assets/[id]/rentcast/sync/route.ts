import { NextResponse } from 'next/server';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import { getNonCashAssetById } from '@/lib/supabase-queries';
import {
  getRentCastIntegrationRowForAccountMember,
  getRentCastIntegrationSupabaseForSync,
} from '@/lib/integrations/rentcast/access';
import {
  syncRentCastAsset,
  toPublicRentCastIntegration,
} from '@/lib/integrations/rentcast/sync';
import type { RentCastAssetFields } from '@/lib/integrations/rentcast/types';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { id } = await params;
    const assetId = parseInt(id, 10);

    if (Number.isNaN(assetId)) {
      return NextResponse.json({ error: 'Invalid asset ID' }, { status: 400 });
    }

    const asset = await getNonCashAssetById(assetId);
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    if (asset.asset_type !== 'real_estate') {
      return NextResponse.json({ error: 'RentCast sync is only available for real estate assets' }, { status: 400 });
    }

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const supabase = await getRentCastIntegrationSupabaseForSync(accountId);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const integration = await getRentCastIntegrationRowForAccountMember(accountId);

    if (!integration?.is_enabled) {
      return NextResponse.json({ error: 'RentCast integration is not enabled' }, { status: 400 });
    }

    const result = await syncRentCastAsset(
      supabase,
      accountId,
      {
        ...asset,
        account_id: accountId,
        asset_type: 'real_estate',
      } as RentCastAssetFields
    );
    const refreshedIntegration = await getRentCastIntegrationRowForAccountMember(accountId);
    const refreshedAsset = await getNonCashAssetById(assetId);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'RentCast sync failed',
          integration: toPublicRentCastIntegration(refreshedIntegration),
          asset: refreshedAsset,
        },
        { status: result.skipped ? 429 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      result,
      integration: toPublicRentCastIntegration(refreshedIntegration),
      asset: refreshedAsset,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error syncing RentCast asset value:', error);
    return NextResponse.json({ error: 'Failed to sync RentCast value' }, { status: 500 });
  }
}
