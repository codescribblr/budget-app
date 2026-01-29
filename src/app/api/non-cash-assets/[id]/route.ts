import { NextRequest, NextResponse } from 'next/server';
import { getNonCashAssetById, updateNonCashAsset, deleteNonCashAsset } from '@/lib/supabase-queries';
import { checkWriteAccess } from '@/lib/api-helpers';
import type { UpdateNonCashAssetRequest } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assetId = parseInt(id);
    
    if (isNaN(assetId)) {
      return NextResponse.json({ error: 'Invalid asset ID' }, { status: 400 });
    }
    
    const asset = await getNonCashAssetById(assetId);

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error: any) {
    console.error('Error fetching asset:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assetId = parseInt(id);
    
    if (isNaN(assetId)) {
      return NextResponse.json({ error: 'Invalid asset ID' }, { status: 400 });
    }

    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;
    
    const body = (await request.json()) as UpdateNonCashAssetRequest;
    const asset = await updateNonCashAsset(assetId, body);

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error: any) {
    console.error('Error updating asset:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assetId = parseInt(id);
    
    if (isNaN(assetId)) {
      return NextResponse.json({ error: 'Invalid asset ID' }, { status: 400 });
    }

    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;
    
    await deleteNonCashAsset(assetId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting asset:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}
