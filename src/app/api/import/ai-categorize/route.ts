import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getAllCategories, isFeatureEnabled } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { aiRateLimiter } from '@/lib/ai/rate-limiter';
import { geminiService } from '@/lib/ai/gemini-service';
import { requirePremiumSubscription, PremiumRequiredError } from '@/lib/subscription-utils';
import type { ParsedTransaction } from '@/lib/import-types';

export async function POST(request: Request) {
  try {
    const { checkWriteAccess } = await import('@/lib/api-helpers');
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

    const { transactions, batchId } = await request.json() as {
      transactions: ParsedTransaction[];
      batchId?: string;
    };

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions provided' },
        { status: 400 }
      );
    }

    // Filter to only uncategorized transactions (no splits)
    const uncategorizedTransactions = transactions.filter(
      (txn) => !txn.isDuplicate && (!txn.splits || txn.splits.length === 0)
    );

    if (uncategorizedTransactions.length === 0) {
      return NextResponse.json({
        suggestions: [],
        message: 'All transactions are already categorized',
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
    const transactionsForAI = uncategorizedTransactions.map((txn) => ({
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
            message: 'The AI categorization service is currently overloaded. Continuing with rule-based categorization only.',
            serviceUnavailable: true,
          },
          { status: 503 }
        );
      }
      // Re-throw other errors to be handled below
      throw aiError;
    }

    // Record usage AFTER successful AI call (only if we got a result)
    await aiRateLimiter.recordUsage(
      user.id,
      accountId,
      'categorization',
      result.tokensUsed,
      0, // tokensInput - not available from this method
      0, // tokensOutput - not available from this method
      result.responseTimeMs,
      {
        transactionCount: uncategorizedTransactions.length,
        categorizedCount: result.suggestions.filter(s => s.categoryId).length,
      }
    );

    // Map suggestions back to transaction format expected by the frontend
    const suggestions = result.suggestions.map((suggestion) => {
      const transaction = uncategorizedTransactions.find(
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
        isAICategorized: true, // Mark as AI-categorized
      };
    }).filter((s): s is NonNullable<typeof s> => s !== null);

    // Mark ai_categorization task as complete if batchId provided
    if (batchId) {
      try {
        const { markTaskCompleteForBatchServer } = await import('@/lib/processing-tasks-server');
        await markTaskCompleteForBatchServer(batchId, 'ai_categorization');
      } catch (error) {
        // Log but don't fail - task tracking is not critical
        console.warn('Failed to mark ai_categorization complete:', error);
      }
    }

    return NextResponse.json({
      suggestions,
      tokensUsed: result.tokensUsed,
      responseTimeMs: result.responseTimeMs,
    });
  } catch (error: any) {
    console.error('Error in AI categorization:', error);
    
    // Don't log service unavailable errors as critical errors
    if (error.isServiceUnavailable || error.message?.includes('temporarily unavailable')) {
      return NextResponse.json(
        {
          suggestions: [],
          error: 'AI service temporarily unavailable',
          message: 'The AI categorization service is currently overloaded. Continuing with rule-based categorization only.',
          serviceUnavailable: true,
        },
        { status: 503 }
      );
    }
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // For other errors, return 200 with empty suggestions so import can continue
    // This prevents the import from failing due to AI issues
    console.warn('AI categorization failed, continuing without AI:', error.message);
    return NextResponse.json({
      suggestions: [],
      error: error.message || 'Failed to categorize transactions with AI',
      message: 'Continuing with rule-based categorization only.',
    });
  }
}

