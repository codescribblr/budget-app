import { NextRequest, NextResponse } from 'next/server';
import { getTagRules, createTagRule } from '@/lib/db/tag-rules';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * GET /api/tag-rules
 * List all tag rules for the current account
 */
export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const rules = await getTagRules();
    return NextResponse.json(rules);
  } catch (error: any) {
    console.error('Error fetching tag rules:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch tag rules' }, { status: 500 });
  }
}

/**
 * POST /api/tag-rules
 * Create a new tag rule
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
    const { tag_id, rule_type, rule_value, priority, is_active } = body;

    if (!tag_id || typeof tag_id !== 'number') {
      return NextResponse.json({ error: 'tag_id is required' }, { status: 400 });
    }

    if (!rule_type || !['category', 'merchant', 'description', 'amount'].includes(rule_type)) {
      return NextResponse.json({ error: 'Invalid rule_type' }, { status: 400 });
    }

    if (!rule_value || typeof rule_value !== 'string' || rule_value.trim().length === 0) {
      return NextResponse.json({ error: 'rule_value is required' }, { status: 400 });
    }

    const rule = await createTagRule({
      tag_id,
      rule_type,
      rule_value,
      priority,
      is_active,
    });
    return NextResponse.json(rule);
  } catch (error: any) {
    console.error('Error creating tag rule:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create tag rule' },
      { status: 500 }
    );
  }
}
