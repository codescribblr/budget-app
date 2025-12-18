import { NextRequest, NextResponse } from 'next/server';
import { mergeTags } from '@/lib/db/tags';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * POST /api/tags/merge
 * Merge multiple tags into one
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
    const { source_tag_ids, target_tag_id } = body;

    if (!Array.isArray(source_tag_ids) || source_tag_ids.length === 0) {
      return NextResponse.json(
        { error: 'source_tag_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!target_tag_id || typeof target_tag_id !== 'number') {
      return NextResponse.json(
        { error: 'target_tag_id is required' },
        { status: 400 }
      );
    }

    if (source_tag_ids.includes(target_tag_id)) {
      return NextResponse.json(
        { error: 'Target tag cannot be in source tags list' },
        { status: 400 }
      );
    }

    const result = await mergeTags(source_tag_ids, target_tag_id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error merging tags:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to merge tags' },
      { status: 500 }
    );
  }
}
