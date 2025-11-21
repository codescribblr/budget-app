import { NextRequest, NextResponse } from 'next/server';
import { searchTransactions } from '@/lib/supabase-queries';

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('q') || '';
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');

    // Require at least 3 characters for search
    if (query.length < 3) {
      return NextResponse.json([]);
    }

    const transactions = await searchTransactions(query, limit);
    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('Error searching transactions:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to search transactions' }, { status: 500 });
  }
}

