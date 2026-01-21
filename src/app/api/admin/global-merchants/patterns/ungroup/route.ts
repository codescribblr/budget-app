import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/global-merchants/patterns/ungroup
 * Ungroup patterns from a merchant (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const body = await request.json();
    const { pattern_ids } = body;
    
    if (!Array.isArray(pattern_ids) || pattern_ids.length === 0) {
      return NextResponse.json(
        { error: 'Pattern IDs array is required' },
        { status: 400 }
      );
    }
    
    // Update patterns to unlink from merchant
    const { error: updateError } = await supabase
      .from('global_merchant_patterns')
      .update({ global_merchant_id: null })
      .in('id', pattern_ids);
    
    if (updateError) throw updateError;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error ungrouping patterns:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to ungroup patterns' },
      { status: 500 }
    );
  }
}
