import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/global-merchants/suggestions
 * List AI merchant suggestions (admin only). Query: status, batch_id, limit, offset.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending'; // pending | all | approved | rejected
    const batchId = searchParams.get('batch_id') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('global_merchant_suggestions')
      .select(`
        id,
        suggested_global_merchant_id,
        suggested_display_name,
        status,
        batch_id,
        created_at,
        reviewed_at,
        global_merchants (
          id,
          display_name,
          status
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== 'all') {
      query = query.eq('status', status);
    }
    if (batchId.trim()) {
      query = query.eq('batch_id', batchId.trim());
    }

    const { data: suggestions, error, count } = await query;

    if (error) throw error;

    const suggestionIds = (suggestions || []).map((s: any) => s.id);
    if (suggestionIds.length === 0) {
      return NextResponse.json({ suggestions: [], total: count ?? 0 });
    }

    const { data: patternRows } = await supabase
      .from('global_merchant_suggestion_patterns')
      .select('suggestion_id, pattern_id')
      .in('suggestion_id', suggestionIds);

    const patternIds = [...new Set((patternRows || []).map((r: any) => r.pattern_id))];
    let patternsMap: Record<number, any> = {};
    if (patternIds.length > 0) {
      const { data: patterns } = await supabase
        .from('global_merchant_patterns')
        .select('id, pattern, usage_count, first_seen_at, last_seen_at')
        .in('id', patternIds);
      patternsMap = (patterns || []).reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {});
    }

    const bySuggestion = (patternRows || []).reduce((acc: Record<number, number[]>, r: any) => {
      if (!acc[r.suggestion_id]) acc[r.suggestion_id] = [];
      acc[r.suggestion_id].push(r.pattern_id);
      return acc;
    }, {});

    const list = (suggestions || []).map((s: any) => {
      const patternIdsForSuggestion = bySuggestion[s.id] || [];
      const patterns = patternIdsForSuggestion.map((pid: number) => patternsMap[pid]).filter(Boolean);
      return {
        id: s.id,
        suggested_global_merchant_id: s.suggested_global_merchant_id,
        suggested_display_name: s.suggested_display_name,
        status: s.status,
        batch_id: s.batch_id,
        created_at: s.created_at,
        reviewed_at: s.reviewed_at,
        global_merchant: s.global_merchants ? s.global_merchants : null,
        pattern_count: patternIdsForSuggestion.length,
        patterns,
      };
    });

    return NextResponse.json({ suggestions: list, total: count ?? 0 });
  } catch (error: any) {
    console.error('Error fetching suggestions:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}
