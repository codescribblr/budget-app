import { NextResponse } from 'next/server';
import { updateQueuedImportStatus } from '@/lib/automatic-imports/queue-manager';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * POST /api/automatic-imports/queue/[id]/reject
 * Reject a queued transaction
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { id } = await params;
    const queuedImportId = parseInt(id);

    if (isNaN(queuedImportId)) {
      return NextResponse.json({ error: 'Invalid queued import ID' }, { status: 400 });
    }

    const body = await request.json();
    const { reviewNotes } = body;

    await updateQueuedImportStatus(queuedImportId, 'rejected', reviewNotes);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in POST /api/automatic-imports/queue/[id]/reject:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reject transaction' },
      { status: 500 }
    );
  }
}

