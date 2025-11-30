import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { aiRateLimiter } from '@/lib/ai/rate-limiter';
import { geminiService } from '@/lib/ai/gemini-service';
import { buildUserContext } from '@/lib/ai/context-builder';
import { requirePremiumSubscription, PremiumRequiredError } from '@/lib/subscription-utils';
import type { ChatMessage } from '@/lib/ai/types';

/**
 * POST /api/ai/chat
 * Handle AI chat queries
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

    const { query, history = [] } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'query is required and must be a string' },
        { status: 400 }
      );
    }

    // Check rate limit
    const rateLimit = await aiRateLimiter.checkLimit(user.id, 'chat');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          resetAt: rateLimit.resetAt.toISOString(),
          remaining: rateLimit.remaining,
        },
        { status: 429 }
      );
    }

    // Build user context (will default to last 3 months for comprehensive data)
    const context = await buildUserContext(user.id);

    // Parse conversation history
    const conversationHistory: ChatMessage[] = Array.isArray(history)
      ? history.map((msg: any) => ({
          role: msg.role || 'user',
          content: msg.content || '',
          timestamp: msg.timestamp ? new Date(msg.timestamp) : undefined,
        }))
      : [];

    // Handle chat query
    const result = await geminiService.handleChat(query, context, conversationHistory);

    // Record usage
    await aiRateLimiter.recordUsage(
      user.id,
      accountId,
      'chat',
      result.tokensUsed,
      0,
      0,
      result.responseTimeMs,
      { queryLength: query.length }
    );

    return NextResponse.json({
      response: result.response,
      tokensUsed: result.tokensUsed,
      responseTimeMs: result.responseTimeMs,
      metadata: result.metadata,
    });
  } catch (error: any) {
    console.error('Error handling chat query:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to process chat query', message: error.message },
      { status: 500 }
    );
  }
}

