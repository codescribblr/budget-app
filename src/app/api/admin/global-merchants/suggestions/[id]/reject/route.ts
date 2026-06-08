import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/global-merchants/suggestions/[id]/reject
 * Reject a suggestion; patterns remain ungrouped. Admin only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAdmin();
    const supabase = await createClient();
    const { id } = await params;
    const suggestionId = parseInt(id, 10);
    if (isNaN(suggestionId)) {
      return NextResponse.json({ error: 'Invalid suggestion ID' }, { status: 400 });
    }

    const { data: suggestion, error: fetchErr } = await supabase
      .from('global_merchant_suggestions')
      .select('id, status')
      .eq('id', suggestionId)
      .single();

    if (fetchErr || !suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }
    if (suggestion.status !== 'pending') {
      return NextResponse.json({ error: 'Suggestion already reviewed' }, { status: 400 });
    }

    await supabase
      .from('global_merchant_suggestions')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
      .eq('id', suggestionId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error rejecting suggestion:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to reject suggestion' }, { status: 500 });
  }
}
