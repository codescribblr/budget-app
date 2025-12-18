import { NextRequest, NextResponse } from 'next/server';
import {
  getTransactionTags,
  addTagsToTransaction,
  setTransactionTags,
} from '@/lib/db/tags';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * GET /api/transactions/[id]/tags
 * Get tags for a transaction
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthenticatedUser();
    const { id } = await params;
    const transactionId = parseInt(id);

    if (isNaN(transactionId)) {
      return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 });
    }

    const tags = await getTransactionTags(transactionId);
    return NextResponse.json(tags);
  } catch (error: any) {
    console.error('Error fetching transaction tags:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch transaction tags' }, { status: 500 });
  }
}

/**
 * POST /api/transactions/[id]/tags
 * Add tags to a transaction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const writeCheck = await checkWriteAccess();
    if (writeCheck) return writeCheck;

    const { id } = await params;
    const transactionId = parseInt(id);

    if (isNaN(transactionId)) {
      return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 });
    }

    const body = await request.json();
    const { tag_ids } = body;

    if (!Array.isArray(tag_ids)) {
      return NextResponse.json(
        { error: 'tag_ids must be an array' },
        { status: 400 }
      );
    }

    const tags = await addTagsToTransaction(transactionId, tag_ids);
    return NextResponse.json({ success: true, tags });
  } catch (error: any) {
    console.error('Error adding tags to transaction:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to add tags to transaction' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/transactions/[id]/tags
 * Replace all tags on a transaction
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const writeCheck = await checkWriteAccess();
    if (writeCheck) return writeCheck;

    const { id } = await params;
    const transactionId = parseInt(id);

    if (isNaN(transactionId)) {
      return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 });
    }

    const body = await request.json();
    const { tag_ids } = body;

    if (!Array.isArray(tag_ids)) {
      return NextResponse.json(
        { error: 'tag_ids must be an array' },
        { status: 400 }
      );
    }

    const tags = await setTransactionTags(transactionId, tag_ids);
    return NextResponse.json({ success: true, tags });
  } catch (error: any) {
    console.error('Error setting transaction tags:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to set transaction tags' },
      { status: 500 }
    );
  }
}
