import { NextRequest, NextResponse } from 'next/server';
import { getTagSuggestions } from '@/lib/db/tag-suggestions';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';

/**
 * GET /api/tags/suggestions
 * Get tag suggestions for a transaction
 */
export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const description = searchParams.get('description') || '';
    const categoryIds = searchParams.get('categoryIds')?.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) || [];
    const merchantGroupId = searchParams.get('merchantGroupId') ? parseInt(searchParams.get('merchantGroupId')!) : null;

    const suggestions = await getTagSuggestions(description, categoryIds, merchantGroupId);
    return NextResponse.json(suggestions);
  } catch (error: any) {
    console.error('Error fetching tag suggestions:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch tag suggestions' }, { status: 500 });
  }
}
