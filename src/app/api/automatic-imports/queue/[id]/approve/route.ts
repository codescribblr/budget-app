import { NextResponse } from 'next/server';
import { approveAndImportQueuedTransactions } from '@/lib/automatic-imports/queue-manager';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * POST /api/automatic-imports/queue/[id]/approve
 * Approve and import a queued transaction
 * Also accepts array of IDs in body for batch approval
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const body = await request.json();
    const { ids } = body; // Array of IDs for batch approval
    
    let queuedImportIds: number[];
    
    if (ids && Array.isArray(ids)) {
      // Batch approval
      queuedImportIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    } else {
      // Single approval
      const { id } = await params;
      const queuedImportId = parseInt(id);
      if (isNaN(queuedImportId)) {
        return NextResponse.json({ error: 'Invalid queued import ID' }, { status: 400 });
      }
      queuedImportIds = [queuedImportId];
    }

    if (queuedImportIds.length === 0) {
      return NextResponse.json({ error: 'No valid IDs provided' }, { status: 400 });
    }

    const result = await approveAndImportQueuedTransactions(queuedImportIds);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in POST /api/automatic-imports/queue/[id]/approve:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve and import transactions' },
      { status: 500 }
    );
  }
}

