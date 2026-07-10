import { NextResponse } from 'next/server';
import { getActiveAccountId } from '@/lib/account-context';
import { getNonCashAssetById, getAuthenticatedUser } from '@/lib/supabase-queries';
import { getRentCastIntegrationForAccountMember } from '@/lib/integrations/rentcast/access';
import type { RentCastValuationSummary } from '@/lib/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
      return NextResponse.json({ error: 'RentCast data is only available for real estate assets' }, { status: 400 });
    }

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { supabase } = await getAuthenticatedUser();
    const integration = await getRentCastIntegrationForAccountMember(accountId);

    const { data: valuation, error } = await supabase
      .from('rentcast_valuations')
      .select(
        'id, estimated_value, price_range_low, price_range_high, subject_property, comparables, fetched_at'
      )
      .eq('asset_id', assetId)
      .eq('account_id', accountId)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      asset: {
        rentcast_enabled: asset.rentcast_enabled ?? false,
        rentcast_last_sync_at: asset.rentcast_last_sync_at ?? null,
        rentcast_last_error: asset.rentcast_last_error ?? null,
        rentcast_value_preference: asset.rentcast_value_preference ?? 'estimate',
        current_value: asset.current_value,
        property_type: asset.property_type ?? null,
        bedrooms: asset.bedrooms ?? null,
        bathrooms: asset.bathrooms ?? null,
        square_footage: asset.square_footage ?? null,
      },
      integration,
      valuation: (valuation as RentCastValuationSummary | null) ?? null,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching RentCast asset data:', error);
    return NextResponse.json({ error: 'Failed to fetch RentCast data' }, { status: 500 });
  }
}
