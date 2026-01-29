import { NextRequest, NextResponse } from 'next/server';
import { getAllNonCashAssets, createNonCashAsset } from '@/lib/supabase-queries';
import { checkWriteAccess } from '@/lib/api-helpers';
import type { CreateNonCashAssetRequest } from '@/lib/types';

/**
 * GET /api/non-cash-assets
 * Get all non-cash assets for the active budget account
 */
export async function GET() {
  try {
    const assets = await getAllNonCashAssets();
    return NextResponse.json(assets);
  } catch (error: any) {
    console.error('Error fetching non-cash assets:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'No active account') {
      return NextResponse.json({ error: 'No active account found' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch non-cash assets' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/non-cash-assets
 * Create a new non-cash asset
 */
export async function POST(request: NextRequest) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const body = (await request.json()) as CreateNonCashAssetRequest;
    const asset = await createNonCashAsset(body);
    return NextResponse.json(asset, { status: 201 });
  } catch (error: any) {
    console.error('Error creating non-cash asset:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'No active account') {
      return NextResponse.json({ error: 'No active account found' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to create non-cash asset' },
      { status: 500 }
    );
  }
}
