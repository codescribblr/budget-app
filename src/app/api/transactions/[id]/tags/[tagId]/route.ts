import { NextRequest, NextResponse } from 'next/server';
import { removeTagFromTransaction } from '@/lib/db/tags';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * DELETE /api/transactions/[id]/tags/[tagId]
 * Remove a tag from a transaction
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  try {
    const writeCheck = await checkWriteAccess();
    if (writeCheck) return writeCheck;

    const { id, tagId } = await params;
    const transactionId = parseInt(id);
    const tagIdNum = parseInt(tagId);

    if (isNaN(transactionId) || isNaN(tagIdNum)) {
      return NextResponse.json({ error: 'Invalid transaction or tag ID' }, { status: 400 });
    }

    await removeTagFromTransaction(transactionId, tagIdNum);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing tag from transaction:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to remove tag from transaction' },
      { status: 500 }
    );
  }
}

