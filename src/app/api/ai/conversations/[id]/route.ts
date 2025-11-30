import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { createClient } from '@/lib/supabase/server';
import { requirePremiumSubscription, PremiumRequiredError } from '@/lib/subscription-utils';

/**
 * GET /api/ai/conversations/[id]
 * Get a specific conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    const { id } = await params;

    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    // Require premium subscription for AI chat
    try {
      await requirePremiumSubscription(accountId);
    } catch (error: any) {
      if (error instanceof PremiumRequiredError) {
        return NextResponse.json(
          { error: 'Premium subscription required', message: 'AI Chat Assistant is a premium feature. Please upgrade to Premium to use this feature.' },
          { status: 403 }
        );
      }
      throw error;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('id, title, messages, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .eq('is_archived', false) // Only return non-archived conversations
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching conversation:', error);
      return NextResponse.json(
        { error: 'Failed to fetch conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in GET /api/ai/conversations/[id]:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch conversation', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ai/conversations/[id]
 * Update a conversation (title, messages, or archive status)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    const { id } = await params;

    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updates: any = {};

    if (body.title !== undefined) {
      updates.title = body.title;
    }
    if (body.messages !== undefined) {
      updates.messages = body.messages;
    }
    if (body.is_archived !== undefined) {
      updates.is_archived = body.is_archived;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ai_conversations')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .select('id, title, messages, created_at, updated_at, is_archived')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }
      console.error('Error updating conversation:', error);
      return NextResponse.json(
        { error: 'Failed to update conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in PATCH /api/ai/conversations/[id]:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to update conversation', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai/conversations/[id]
 * Archive a conversation (soft delete - preserves data for analytics)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    const { id } = await params;

    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    // Require premium subscription for AI chat
    try {
      await requirePremiumSubscription(accountId);
    } catch (error: any) {
      if (error instanceof PremiumRequiredError) {
        return NextResponse.json(
          { error: 'Premium subscription required', message: 'AI Chat Assistant is a premium feature. Please upgrade to Premium to use this feature.' },
          { status: 403 }
        );
      }
      throw error;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ai_conversations')
      .update({ is_archived: true })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }
      console.error('Error archiving conversation:', error);
      return NextResponse.json(
        { error: 'Failed to archive conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, archived: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/ai/conversations/[id]:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to archive conversation', message: error.message },
      { status: 500 }
    );
  }
}

