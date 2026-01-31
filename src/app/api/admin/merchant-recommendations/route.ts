import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/merchant-recommendations
 * Get all merchant recommendations (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending', 'approved', 'denied', 'merged', or null for all
    
    let query = supabase
      .from('merchant_recommendations')
      .select(`
        *,
        merchant_recommendation_patterns (
          pattern
        ),
        transactions (
          id,
          description,
          date
        )
      `)
      .order('pattern_count', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (status && ['pending', 'approved', 'denied', 'merged'].includes(status)) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({ recommendations: data || [] });
  } catch (error: any) {
    console.error('Error fetching merchant recommendations:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
