import { NextResponse } from 'next/server';
import {
  getMerchantGroup,
  updateMerchantGroup,
  deleteMerchantGroup,
} from '@/lib/db/merchant-groups';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);

    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const group = await getMerchantGroup(groupId);

    if (!group) {
      return NextResponse.json({ error: 'Merchant group not found' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error fetching merchant group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch merchant group' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);

    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const { display_name } = body;

    if (!display_name) {
      return NextResponse.json(
        { error: 'display_name is required' },
        { status: 400 }
      );
    }

    const group = await updateMerchantGroup(groupId, display_name);
    return NextResponse.json(group);
  } catch (error) {
    console.error('Error updating merchant group:', error);
    return NextResponse.json(
      { error: 'Failed to update merchant group' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);

    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const { display_name } = body;

    if (!display_name) {
      return NextResponse.json(
        { error: 'display_name is required' },
        { status: 400 }
      );
    }

    const group = await updateMerchantGroup(groupId, display_name);
    return NextResponse.json(group);
  } catch (error) {
    console.error('Error updating merchant group:', error);
    return NextResponse.json(
      { error: 'Failed to update merchant group' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);

    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await deleteMerchantGroup(groupId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting merchant group:', error);
    return NextResponse.json(
      { error: 'Failed to delete merchant group' },
      { status: 500 }
    );
  }
}

