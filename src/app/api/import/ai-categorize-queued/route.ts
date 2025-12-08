import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getAllCategories, isFeatureEnabled } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { aiRateLimiter } from '@/lib/ai/rate-limiter';
import { geminiService } from '@/lib/ai/gemini-service';
import { requirePremiumSubscription, PremiumRequiredError } from '@/lib/subscription-utils';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * POST /api/import/ai-categorize-queued
 * Categorize queued import transactions using AI
 * Similar to /api/import/ai-categorize but updates queued_imports table
 */
export async function POST(request: Request) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { user } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();

    if (!accountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    // Require premium subscription for AI categorization
    try {
      await requirePremiumSubscription(accountId);
    } catch (error: any) {
      if (error instanceof PremiumRequiredError) {
        return NextResponse.json(
          { error: 'Premium subscription required', message: 'AI categorization is a premium feature. Please upgrade to Premium to use this feature.' },
          { status: 403 }
        );
      }
      throw error;
    }

    // Check if AI feature is enabled
    const aiFeatureEnabled = await isFeatureEnabled('ai_chat');
    if (!aiFeatureEnabled) {
      return NextResponse.json(
        { error: 'Feature disabled', message: 'AI features are disabled for this account. Enable AI features in Settings to use this feature.' },
        { status: 403 }
      );
    }

    const { transactions } = await request.json() as {
      transactions: Array<{
        id: string; // Format: queued-{id}
        merchant: string;
        description: string;
        amount: number;
        date: string;
        transaction_type: 'income' | 'expense';
      }>;
    };

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions provided' },
        { status: 400 }
      );
    }

    // Filter to only queued import transactions
    const queuedTransactions = transactions.filter(txn => 
      typeof txn.id === 'string' && txn.id.startsWith('queued-')
    );

    if (queuedTransactions.length === 0) {
      return NextResponse.json({
        suggestions: [],
        message: 'No queued import transactions provided',
      });
    }

    // Check rate limit BEFORE making AI call
    const rateLimit = await aiRateLimiter.checkLimit(user.id, 'categorization');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Daily AI categorization limit reached (${rateLimit.remaining} remaining). Try again tomorrow.`,
          resetAt: rateLimit.resetAt.toISOString(),
          remaining: rateLimit.remaining,
        },
        { status: 429 }
      );
    }

    // Fetch all categories (exclude goal categories)
    const categories = await getAllCategories(true);

    // Prepare transactions for AI categorization
    const transactionsForAI = queuedTransactions.map((txn) => ({
      id: txn.id,
      merchant: txn.merchant,
      description: txn.description,
      amount: txn.amount,
      date: txn.date,
      transaction_type: txn.transaction_type,
    }));

    // Call AI categorization
    let result;
    try {
      result = await geminiService.categorizeImportTransactions(
        transactionsForAI,
        categories.map((c) => ({ id: c.id, name: c.name }))
      );
    } catch (aiError: any) {
      // Handle service unavailable errors gracefully (don't consume rate limit)
      if (aiError.isServiceUnavailable || aiError.message?.includes('temporarily unavailable')) {
        return NextResponse.json(
          {
            suggestions: [],
            error: 'AI service temporarily unavailable',
            message: 'The AI categorization service is currently overloaded. Please try again later.',
            serviceUnavailable: true,
          },
          { status: 503 }
        );
      }
      // Re-throw other errors to be handled below
      throw aiError;
    }

    // Record usage AFTER successful AI call
    await aiRateLimiter.recordUsage(
      user.id,
      accountId,
      'categorization',
      result.tokensUsed,
      0, // tokensInput - not available from this method
      0, // tokensOutput - not available from this method
      result.responseTimeMs,
      {
        transactionCount: queuedTransactions.length,
        categorizedCount: result.suggestions.filter(s => s.categoryId).length,
      }
    );

    // Update queued_imports table with suggested categories
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    for (const suggestion of result.suggestions) {
      if (!suggestion.categoryId) continue;

      // Extract queued import ID from transaction ID (format: queued-{id})
      const queuedImportId = parseInt(suggestion.transactionId.replace('queued-', ''));
      if (isNaN(queuedImportId)) continue;

      // Update queued import with suggested category
      await supabase
        .from('queued_imports')
        .update({
          suggested_category_id: suggestion.categoryId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', queuedImportId)
        .eq('account_id', accountId);
    }

    // Map suggestions back to transaction format expected by the frontend
    const suggestions = result.suggestions.map((suggestion) => {
      const transaction = queuedTransactions.find(
        (t) => t.id === suggestion.transactionId
      );
      
      if (!transaction) {
        return null;
      }

      return {
        transactionId: suggestion.transactionId,
        categoryId: suggestion.categoryId,
        categoryName: suggestion.categoryName,
        confidence: suggestion.confidence,
        reason: suggestion.reason,
        isAICategorized: true,
      };
    }).filter((s): s is NonNullable<typeof s> => s !== null);

    return NextResponse.json({
      suggestions,
      tokensUsed: result.tokensUsed,
      responseTimeMs: result.responseTimeMs,
    });
  } catch (error: any) {
    console.error('Error in AI categorization for queued imports:', error);
    
    // Don't log service unavailable errors as critical errors
    if (error.isServiceUnavailable || error.message?.includes('temporarily unavailable')) {
      return NextResponse.json(
        {
          suggestions: [],
          error: 'AI service temporarily unavailable',
          message: 'The AI categorization service is currently overloaded. Please try again later.',
          serviceUnavailable: true,
        },
        { status: 503 }
      );
    }
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({
      suggestions: [],
      error: error.message || 'Failed to categorize transactions with AI',
      message: 'An error occurred during AI categorization.',
    }, { status: 500 });
  }
}

