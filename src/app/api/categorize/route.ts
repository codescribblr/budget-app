import { NextResponse } from 'next/server';
import { getSmartCategorySuggestion } from '@/lib/smart-categorizer-supabase';
import { getAllCategories } from '@/lib/supabase-queries';

export async function POST(request: Request) {
  try {
    const { merchants } = await request.json() as { merchants: string[] };

    if (!Array.isArray(merchants)) {
      return NextResponse.json(
        { error: 'merchants must be an array' },
        { status: 400 }
      );
    }

    // Fetch all categories
    const categories = await getAllCategories();

    // Get suggestions for each merchant
    const suggestions = await Promise.all(
      merchants.map(async (merchant) => {
        const suggestion = await getSmartCategorySuggestion(merchant, categories);
        return {
          merchant,
          categoryId: suggestion?.categoryId,
          confidence: suggestion?.confidence,
          source: suggestion?.source,
        };
      })
    );

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
