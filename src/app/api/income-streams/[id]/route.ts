import { NextRequest, NextResponse } from 'next/server';
import { updateIncomeStream, deleteIncomeStream } from '@/lib/supabase-queries';
import { checkWriteAccess } from '@/lib/api-helpers';
import type { UpdateIncomeStreamRequest } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { id } = await params;
    const streamId = parseInt(id);
    if (isNaN(streamId)) {
      return NextResponse.json({ error: 'Invalid stream ID' }, { status: 400 });
    }

    const body = (await request.json()) as UpdateIncomeStreamRequest;
    const stream = await updateIncomeStream(streamId, body);
    return NextResponse.json(stream);
  } catch (error: any) {
    console.error('Error updating income stream:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update income stream' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { id } = await params;
    const streamId = parseInt(id);
    if (isNaN(streamId)) {
      return NextResponse.json({ error: 'Invalid stream ID' }, { status: 400 });
    }

    await deleteIncomeStream(streamId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting income stream:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to delete income stream' }, { status: 500 });
  }
}
