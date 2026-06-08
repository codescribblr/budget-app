import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { aiRateLimiter } from '@/lib/ai/rate-limiter';
import { geminiService } from '@/lib/ai/gemini-service';
import { getAllCategories } from '@/lib/supabase-queries';

/**
 * POST /api/ai/categorize
 * Categorize transactions using AI
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

    const { transactionIds } = await request.json();

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json(
        { error: 'transactionIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Check rate limit
    const rateLimit = await aiRateLimiter.checkLimit(user.id, 'categorization');
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

    // Get transactions
    const { supabase } = await getAuthenticatedUser();
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, merchant, total_amount, date, categories(name)')
      .in('id', transactionIds)
      .eq('account_id', accountId);

    if (txError || !transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'Transactions not found' },
        { status: 404 }
      );
    }

    // Get available categories
    const categories = await getAllCategories(true);

    // Categorize with AI
    const result = await geminiService.categorizeBatch(
      transactions.map((t) => ({
        id: t.id,
        merchant: t.merchant || 'Unknown',
        amount: t.total_amount || 0,
        date: t.date,
        currentCategory: (t.categories as any)?.name,
      })),
      categories.map((c) => ({ id: c.id, name: c.name }))
    );

    // Record usage
    await aiRateLimiter.recordUsage(
      user.id,
      accountId,
      'categorization',
      result.tokensUsed,
      0,
      0,
      result.responseTimeMs,
      { transactionCount: transactions.length }
    );

    // Store categorization history
    for (const suggestion of result.suggestions) {
      await supabase.from('ai_categorization_history').insert({
        transaction_id: suggestion.transactionId,
        user_id: user.id,
        suggested_category_id: suggestion.categoryId,
        confidence: suggestion.confidence,
      });
    }

    return NextResponse.json({
      results: result.suggestions,
      tokensUsed: result.tokensUsed,
      responseTimeMs: result.responseTimeMs,
    });
  } catch (error: any) {
    console.error('Error categorizing transactions:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to categorize transactions', message: error.message },
      { status: 500 }
    );
  }
}


