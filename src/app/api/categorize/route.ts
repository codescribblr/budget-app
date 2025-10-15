import { NextResponse } from 'next/server';
import { getSmartCategorySuggestion } from '@/lib/smart-categorizer';
import db from '@/lib/db';

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
    const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();

    // Get suggestions for each merchant
    const suggestions = merchants.map(merchant => {
      const suggestion = getSmartCategorySuggestion(merchant, categories);
      return {
        merchant,
        categoryId: suggestion?.categoryId,
        confidence: suggestion?.confidence,
        source: suggestion?.source,
      };
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error getting category suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}

