import { NextRequest, NextResponse } from 'next/server';
import { bulkRemoveTags } from '@/lib/db/tags';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * POST /api/tags/bulk-remove
 * Remove tags from multiple transactions
 */
export async function POST(request: NextRequest) {
  try {
    const writeCheck = await checkWriteAccess();
    if (writeCheck) return writeCheck;

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const body = await request.json();
    const { transaction_ids, tag_ids } = body;

    if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) {
      return NextResponse.json(
        { error: 'transaction_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!Array.isArray(tag_ids) || tag_ids.length === 0) {
      return NextResponse.json(
        { error: 'tag_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    const count = await bulkRemoveTags(transaction_ids, tag_ids);
    return NextResponse.json({ success: true, updated_count: count });
  } catch (error: any) {
    console.error('Error bulk removing tags:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to bulk remove tags' },
      { status: 500 }
    );
  }
}

