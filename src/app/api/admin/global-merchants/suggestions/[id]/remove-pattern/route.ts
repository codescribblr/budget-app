import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/global-merchants/suggestions/[id]/remove-pattern
 * Remove one pattern from a suggestion; record rejection so AI won't re-suggest. Admin only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { id } = await params;
    const suggestionId = parseInt(id, 10);
    if (isNaN(suggestionId)) {
      return NextResponse.json({ error: 'Invalid suggestion ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const patternId = typeof body.pattern_id === 'number' ? body.pattern_id : parseInt(body.pattern_id, 10);
    if (isNaN(patternId)) {
      return NextResponse.json({ error: 'pattern_id is required' }, { status: 400 });
    }

    const { data: suggestion, error: fetchErr } = await supabase
      .from('global_merchant_suggestions')
      .select('id, status, suggested_global_merchant_id, suggested_display_name')
      .eq('id', suggestionId)
      .single();

    if (fetchErr || !suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }
    if (suggestion.status !== 'pending') {
      return NextResponse.json({ error: 'Suggestion already reviewed' }, { status: 400 });
    }

    const { data: junction, error: junctionErr } = await supabase
      .from('global_merchant_suggestion_patterns')
      .select('suggestion_id, pattern_id')
      .eq('suggestion_id', suggestionId)
      .eq('pattern_id', patternId)
      .maybeSingle();

    if (junctionErr || !junction) {
      return NextResponse.json({ error: 'Pattern not in this suggestion' }, { status: 404 });
    }

    await supabase
      .from('global_merchant_suggestion_patterns')
      .delete()
      .eq('suggestion_id', suggestionId)
      .eq('pattern_id', patternId);

    const rejectedMerchantId = suggestion.suggested_global_merchant_id ?? null;
    const rejectedName = suggestion.suggested_display_name
      ? suggestion.suggested_display_name.toLowerCase().trim().replace(/\s+/g, ' ')
      : null;
    if (rejectedMerchantId !== null || rejectedName) {
      await supabase.from('global_merchant_pattern_rejections').insert({
        pattern_id: patternId,
        rejected_global_merchant_id: rejectedMerchantId,
        rejected_suggested_display_name: rejectedName,
      });
    }

    const { data: remaining } = await supabase
      .from('global_merchant_suggestion_patterns')
      .select('pattern_id')
      .eq('suggestion_id', suggestionId);
    if (!remaining || remaining.length === 0) {
      await supabase
        .from('global_merchant_suggestions')
        .update({ status: 'rejected' })
        .eq('id', suggestionId);
    }

    return NextResponse.json({ success: true, remaining_count: (remaining || []).length });
  } catch (error: any) {
    console.error('Error removing pattern from suggestion:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to remove pattern' }, { status: 500 });
  }
}
