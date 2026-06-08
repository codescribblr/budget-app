import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/global-merchants/patterns/group
 * Group patterns under a merchant (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const body = await request.json();
    const { merchant_id, pattern_ids } = body;
    
    if (!merchant_id || typeof merchant_id !== 'number') {
      return NextResponse.json(
        { error: 'Merchant ID is required' },
        { status: 400 }
      );
    }
    
    if (!Array.isArray(pattern_ids) || pattern_ids.length === 0) {
      return NextResponse.json(
        { error: 'Pattern IDs array is required' },
        { status: 400 }
      );
    }
    
    // Verify merchant exists
    const { data: merchant, error: merchantError } = await supabase
      .from('global_merchants')
      .select('id')
      .eq('id', merchant_id)
      .single();
    
    if (merchantError || !merchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      );
    }
    
    // Update patterns to link to merchant
    const { error: updateError } = await supabase
      .from('global_merchant_patterns')
      .update({ global_merchant_id: merchant_id })
      .in('id', pattern_ids);
    
    if (updateError) throw updateError;
    
    // Sync transactions for the grouped patterns
    try {
      const { syncTransactionsForPatterns } = await import('@/lib/db/sync-merchant-groups');
      const syncResult = await syncTransactionsForPatterns(pattern_ids, merchant_id);
      
      return NextResponse.json({ 
        success: true,
        transactions_updated: syncResult.transactionsUpdated,
        groups_created: syncResult.groupsCreated,
      });
    } catch (syncError: any) {
      console.error('Error syncing transactions:', syncError);
      // Don't fail the request if sync fails - patterns are still grouped
      return NextResponse.json({ 
        success: true,
        warning: 'Patterns grouped but transaction sync had errors',
        transactions_updated: 0,
        groups_created: 0,
      });
    }
  } catch (error: any) {
    console.error('Error grouping patterns:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to group patterns' },
      { status: 500 }
    );
  }
}
