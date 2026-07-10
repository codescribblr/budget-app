import { NextResponse } from 'next/server';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import { getAuthenticatedUser, getNonCashAssetById } from '@/lib/supabase-queries';
import { resolveRentCastStoredValue } from '@/lib/integrations/rentcast/sync';
import {
  RENTCAST_VALUE_PREFERENCES,
  type RentCastValuePreference,
} from '@/lib/integrations/rentcast/types';
import { createNetWorthSnapshot } from '@/lib/audit/account-balance-audit';

/**
 * POST /api/non-cash-assets/[id]/rentcast/select-value
 * Apply a RentCast figure (estimate | low | high) as the asset's current_value
 * and remember the preference for future syncs. Does not call the RentCast API.
 */
export async function POST(
  request: Request,
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

    const body = await request.json();
    const preference = body?.preference as RentCastValuePreference | undefined;
    if (!preference || !RENTCAST_VALUE_PREFERENCES.includes(preference)) {
      return NextResponse.json(
        { error: 'preference must be one of: estimate, low, high' },
        { status: 400 }
      );
    }

    const asset = await getNonCashAssetById(assetId);
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    if (asset.asset_type !== 'real_estate') {
      return NextResponse.json(
        { error: 'RentCast values are only available for real estate assets' },
        { status: 400 }
      );
    }

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { supabase, user } = await getAuthenticatedUser();

    const { data: valuation, error: valuationError } = await supabase
      .from('rentcast_valuations')
      .select('estimated_value, price_range_low, price_range_high')
      .eq('asset_id', assetId)
      .eq('account_id', accountId)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (valuationError) throw valuationError;
    if (!valuation) {
      return NextResponse.json(
        { error: 'No RentCast valuation available. Sync first.' },
        { status: 400 }
      );
    }

    if (preference === 'low' && valuation.price_range_low == null) {
      return NextResponse.json({ error: 'Low range is not available for this valuation' }, { status: 400 });
    }
    if (preference === 'high' && valuation.price_range_high == null) {
      return NextResponse.json({ error: 'High range is not available for this valuation' }, { status: 400 });
    }

    const { value: newValue, appliedPreference } = resolveRentCastStoredValue(
      {
        price: Number(valuation.estimated_value),
        priceRangeLow: valuation.price_range_low != null ? Number(valuation.price_range_low) : undefined,
        priceRangeHigh: valuation.price_range_high != null ? Number(valuation.price_range_high) : undefined,
      },
      preference
    );

    const oldValue = Number(asset.current_value);

    const { data: updated, error: updateError } = await supabase
      .from('non_cash_assets')
      .update({
        current_value: newValue,
        rentcast_value_preference: appliedPreference,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assetId)
      .eq('account_id', accountId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    if (Math.abs(newValue - oldValue) >= 0.01) {
      await supabase.from('asset_value_audit').insert({
        asset_id: assetId,
        budget_account_id: accountId,
        user_id: user.id,
        old_value: oldValue,
        new_value: newValue,
        change_amount: newValue - oldValue,
        change_type: 'manual_edit',
        description: `Selected RentCast ${appliedPreference} value`,
        metadata: {
          source: 'rentcast_preference',
          value_preference: appliedPreference,
          estimated_value: valuation.estimated_value,
          price_range_low: valuation.price_range_low,
          price_range_high: valuation.price_range_high,
        },
      });
      await createNetWorthSnapshot();
    }

    return NextResponse.json({
      success: true,
      preference: appliedPreference,
      oldValue,
      newValue,
      asset: updated,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error selecting RentCast value:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to select RentCast value' },
      { status: 500 }
    );
  }
}
