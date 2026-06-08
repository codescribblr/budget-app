import { NextRequest, NextResponse } from 'next/server';
import { getTagRuleById, updateTagRule, deleteTagRule } from '@/lib/db/tag-rules';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * GET /api/tag-rules/[id]
 * Get a specific tag rule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthenticatedUser();
    const { id } = await params;
    const ruleId = parseInt(id);

    if (isNaN(ruleId)) {
      return NextResponse.json({ error: 'Invalid rule ID' }, { status: 400 });
    }

    const rule = await getTagRuleById(ruleId);
    if (!rule) {
      return NextResponse.json({ error: 'Tag rule not found' }, { status: 404 });
    }

    return NextResponse.json(rule);
  } catch (error: any) {
    console.error('Error fetching tag rule:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch tag rule' }, { status: 500 });
  }
}

/**
 * PATCH /api/tag-rules/[id]
 * Update a tag rule
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const writeCheck = await checkWriteAccess();
    if (writeCheck) return writeCheck;

    const { id } = await params;
    const ruleId = parseInt(id);

    if (isNaN(ruleId)) {
      return NextResponse.json({ error: 'Invalid rule ID' }, { status: 400 });
    }

    const body = await request.json();
    const { tag_id, rule_type, rule_value, priority, is_active } = body;

    if (rule_type && !['category', 'merchant', 'description', 'amount'].includes(rule_type)) {
      return NextResponse.json({ error: 'Invalid rule_type' }, { status: 400 });
    }

    const rule = await updateTagRule(ruleId, {
      tag_id,
      rule_type,
      rule_value,
      priority,
      is_active,
    });
    return NextResponse.json(rule);
  } catch (error: any) {
    console.error('Error updating tag rule:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to update tag rule' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tag-rules/[id]
 * Delete a tag rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const writeCheck = await checkWriteAccess();
    if (writeCheck) return writeCheck;

    const { id } = await params;
    const ruleId = parseInt(id);

    if (isNaN(ruleId)) {
      return NextResponse.json({ error: 'Invalid rule ID' }, { status: 400 });
    }

    await deleteTagRule(ruleId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting tag rule:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to delete tag rule' },
      { status: 500 }
    );
  }
}

