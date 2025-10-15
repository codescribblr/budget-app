import { NextRequest, NextResponse } from 'next/server';
import { getPendingCheckById, updatePendingCheck, deletePendingCheck } from '@/lib/queries';
import type { UpdatePendingCheckRequest } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pendingCheck = getPendingCheckById(parseInt(id));

    if (!pendingCheck) {
      return NextResponse.json({ error: 'Pending check not found' }, { status: 404 });
    }

    return NextResponse.json(pendingCheck);
  } catch (error) {
    console.error('Error fetching pending check:', error);
    return NextResponse.json({ error: 'Failed to fetch pending check' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdatePendingCheckRequest;
    const pendingCheck = updatePendingCheck(parseInt(id), body);

    if (!pendingCheck) {
      return NextResponse.json({ error: 'Pending check not found' }, { status: 404 });
    }

    return NextResponse.json(pendingCheck);
  } catch (error) {
    console.error('Error updating pending check:', error);
    return NextResponse.json({ error: 'Failed to update pending check' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    deletePendingCheck(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pending check:', error);
    return NextResponse.json({ error: 'Failed to delete pending check' }, { status: 500 });
  }
}

