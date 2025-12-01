import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getAllCategories } from '@/lib/supabase-queries';
import { geminiService } from '@/lib/ai/gemini-service';
import type { ParsedTransaction } from '@/lib/import-types';

export async function POST(request: Request) {
  try {
    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { transactions } = await request.json() as {
      transactions: ParsedTransaction[];
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
    const result = await geminiService.categorizeImportTransactions(
      transactionsForAI,
      categories.map((c) => ({ id: c.id, name: c.name }))
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

    return NextResponse.json({
      suggestions,
      tokensUsed: result.tokensUsed,
      responseTimeMs: result.responseTimeMs,
    });
  } catch (error: any) {
    console.error('Error in AI categorization:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to categorize transactions with AI' },
      { status: 500 }
    );
  }
}

