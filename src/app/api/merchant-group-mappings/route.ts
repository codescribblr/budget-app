import { NextResponse } from 'next/server';
import {
  getMerchantMappings as getGroupMappings,
  createMerchantMapping,
  updateMerchantMapping,
  deleteMerchantMapping,
} from '@/lib/db/merchant-groups';
import { normalizeMerchantName } from '@/lib/merchant-grouping';

export async function GET() {
  try {
    const mappings = await getGroupMappings();
    return NextResponse.json(mappings);
  } catch (error) {
    console.error('Error fetching merchant group mappings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch merchant group mappings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pattern, merchant_group_id, is_automatic, confidence_score } = body;

    if (!pattern) {
      return NextResponse.json(
        { error: 'pattern is required' },
        { status: 400 }
      );
    }

    const normalizedPattern = normalizeMerchantName(pattern);

    const mapping = await createMerchantMapping(
      pattern,
      normalizedPattern,
      merchant_group_id || null,
      is_automatic !== undefined ? is_automatic : true,
      confidence_score || 0
    );

    return NextResponse.json(mapping, { status: 201 });
  } catch (error) {
    console.error('Error creating merchant group mapping:', error);
    return NextResponse.json(
      { error: 'Failed to create merchant group mapping' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, merchant_group_id, is_automatic, confidence_score } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (merchant_group_id !== undefined) updates.merchant_group_id = merchant_group_id;
    if (is_automatic !== undefined) updates.is_automatic = is_automatic;
    if (confidence_score !== undefined) updates.confidence_score = confidence_score;

    const mapping = await updateMerchantMapping(id, updates);
    return NextResponse.json(mapping);
  } catch (error) {
    console.error('Error updating merchant group mapping:', error);
    return NextResponse.json(
      { error: 'Failed to update merchant group mapping' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    await deleteMerchantMapping(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting merchant group mapping:', error);
    return NextResponse.json(
      { error: 'Failed to delete merchant group mapping' },
      { status: 500 }
    );
  }
}

