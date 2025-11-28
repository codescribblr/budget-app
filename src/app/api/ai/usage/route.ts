import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { aiRateLimiter } from '@/lib/ai/rate-limiter';

/**
 * GET /api/ai/usage
 * Get AI usage statistics for the current user
 */
export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();
    const stats = await aiRateLimiter.getUsageStats(user.id);

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error fetching AI usage:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch usage statistics' },
      { status: 500 }
    );
  }
}

