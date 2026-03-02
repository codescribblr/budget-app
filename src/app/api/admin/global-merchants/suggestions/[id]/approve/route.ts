import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/global-merchants/suggestions/[id]/approve
 * Approve a suggestion: group patterns under the suggested merchant (or create new). Admin only.
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

    const body = await request.json().catch(() => ({}));
    const patternIds = Array.isArray(body.pattern_ids) ? body.pattern_ids : null;
    const overrideMerchantId = typeof body.merchant_id === 'number' ? body.merchant_id : null;
    const overrideMerchantName = typeof body.merchant_name === 'string' ? body.merchant_name.trim() : null;

    const { data: suggestion, error: fetchErr } = await supabase
      .from('global_merchant_suggestions')
      .select('id, suggested_global_merchant_id, suggested_display_name, status')
      .eq('id', suggestionId)
      .single();

    if (fetchErr || !suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }
    if (suggestion.status !== 'pending') {
      return NextResponse.json({ error: 'Suggestion already reviewed' }, { status: 400 });
    }

    const { data: junctionRows } = await supabase
      .from('global_merchant_suggestion_patterns')
      .select('pattern_id')
      .eq('suggestion_id', suggestionId);
    const allPatternIds = (junctionRows || []).map((r: any) => r.pattern_id);
    const toApprove = patternIds && patternIds.length > 0
      ? patternIds.filter((pid: number) => allPatternIds.includes(pid))
      : allPatternIds;

    if (toApprove.length === 0) {
      return NextResponse.json({ error: 'No patterns to approve' }, { status: 400 });
    }

    let merchantId: number;
    if (overrideMerchantId != null) {
      const { data: m } = await supabase
        .from('global_merchants')
        .select('id')
        .eq('id', overrideMerchantId)
        .single();
      if (!m) return NextResponse.json({ error: 'Selected merchant not found' }, { status: 404 });
      merchantId = m.id;
    } else if (overrideMerchantName !== null && overrideMerchantName !== '') {
      const { data: existing } = await supabase
        .from('global_merchants')
        .select('id')
        .eq('display_name', overrideMerchantName)
        .maybeSingle();
      if (existing) {
        return NextResponse.json(
          { error: `Merchant "${overrideMerchantName}" already exists. Link to existing merchant instead.` },
          { status: 400 }
        );
      }
      const { data: created, error: createErr } = await supabase
        .from('global_merchants')
        .insert({ display_name: overrideMerchantName, status: 'active', created_by: user.id })
        .select('id')
        .single();
      if (createErr || !created) {
        return NextResponse.json({ error: 'Failed to create merchant' }, { status: 500 });
      }
      merchantId = created.id;
    } else if (suggestion.suggested_global_merchant_id != null) {
      const { data: m } = await supabase
        .from('global_merchants')
        .select('id')
        .eq('id', suggestion.suggested_global_merchant_id)
        .single();
      if (!m) return NextResponse.json({ error: 'Suggested merchant not found' }, { status: 404 });
      merchantId = m.id;
    } else {
      const displayName = (suggestion.suggested_display_name || '').trim();
      if (!displayName) return NextResponse.json({ error: 'Suggested display name missing' }, { status: 400 });
      const { data: existing } = await supabase
        .from('global_merchants')
        .select('id')
        .eq('display_name', displayName)
        .maybeSingle();
      if (existing) {
        return NextResponse.json(
          { error: `Merchant "${displayName}" already exists. Use "Link to existing" and select it.` },
          { status: 400 }
        );
      }
      const { data: created, error: createErr } = await supabase
        .from('global_merchants')
        .insert({ display_name: displayName, status: 'active', created_by: user.id })
        .select('id')
        .single();
      if (createErr || !created) {
        return NextResponse.json({ error: 'Failed to create merchant' }, { status: 500 });
      }
      merchantId = created.id;
    }

    const { error: updateErr } = await supabase
      .from('global_merchant_patterns')
      .update({ global_merchant_id: merchantId })
      .in('id', toApprove);

    if (updateErr) throw updateErr;

    try {
      const { syncTransactionsForPatterns } = await import('@/lib/db/sync-merchant-groups');
      await syncTransactionsForPatterns(toApprove, merchantId);
    } catch (syncErr) {
      console.error('Sync after approve:', syncErr);
    }

    await supabase
      .from('global_merchant_suggestions')
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
      .eq('id', suggestionId);

    return NextResponse.json({
      success: true,
      merchant_id: merchantId,
      patterns_grouped: toApprove.length,
    });
  } catch (error: any) {
    console.error('Error approving suggestion:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to approve suggestion' }, { status: 500 });
  }
}
