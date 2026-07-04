import { NextResponse } from 'next/server';
import { getSmartCategorySuggestion } from '@/lib/smart-categorizer-supabase';
import { getAllCategories } from '@/lib/supabase-queries';

export async function POST(request: Request) {
  try {
    const { merchants, batchId } = await request.json() as { 
      merchants: string[];
      batchId?: string;
    };

    if (!Array.isArray(merchants)) {
      return NextResponse.json(
        { error: 'merchants must be an array' },
        { status: 400 }
      );
    }

    // Fetch all categories once
    const categories = await getAllCategories(true);

    // Deduplicate merchants to avoid redundant categorization lookups
    const merchantToIndices = new Map<string, number[]>();
    merchants.forEach((merchant, index) => {
      const key = merchant || '';
      const existing = merchantToIndices.get(key);
      if (existing) {
        existing.push(index);
      } else {
        merchantToIndices.set(key, [index]);
      }
    });

    const uniqueMerchants = Array.from(merchantToIndices.keys());
    const uniqueSuggestions = await Promise.all(
      uniqueMerchants.map(async (merchant) => {
        const suggestion = await getSmartCategorySuggestion(merchant, categories);
        return {
          merchant,
          categoryId: suggestion?.categoryId,
          confidence: suggestion?.confidence,
          source: suggestion?.source,
        };
      })
    );

    const suggestionByMerchant = new Map(
      uniqueSuggestions.map((suggestion) => [suggestion.merchant, suggestion])
    );

    const suggestions = merchants.map((merchant) =>
      suggestionByMerchant.get(merchant || '') || {
        merchant,
        categoryId: undefined,
        confidence: undefined,
        source: undefined,
      }
    );

    // Mark categorization task as complete if batchId provided
    if (batchId) {
      try {
        const { markTaskCompleteForBatchServer } = await import('@/lib/processing-tasks-server');
        await markTaskCompleteForBatchServer(batchId, 'categorization');
      } catch (error) {
        // Log but don't fail - task tracking is not critical
        console.warn('Failed to mark categorization complete:', error);
      }
    }

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('Error getting category suggestions:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}

