import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { createClient } from '@/lib/supabase/server';
import { requirePremiumSubscription, PremiumRequiredError } from '@/lib/subscription-utils';
import type { ChatMessage } from '@/lib/ai/types';

/**
 * GET /api/ai/conversations
 * Get all conversations for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();

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
      .select('id, title, messages, created_at, updated_at, is_archived')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error in GET /api/ai/conversations:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch conversations', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/conversations
 * Create a new conversation
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();

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

    const { title, messages } = await request.json();

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'title is required and must be a string' },
        { status: 400 }
      );
    }

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages must be an array' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: user.id,
        account_id: accountId,
        title,
        messages,
      })
      .select('id, title, messages, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in POST /api/ai/conversations:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to create conversation', message: error.message },
      { status: 500 }
    );
  }
}


