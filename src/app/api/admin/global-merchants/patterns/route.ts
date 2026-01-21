import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/global-merchants/patterns
 * Get all global merchant patterns, optionally filtered (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchant_id');
    const ungrouped = searchParams.get('ungrouped') === 'true';
    const limit = searchParams.get('limit');
    
    let query = supabase
      .from('global_merchant_patterns')
      .select('*')
      .order('usage_count', { ascending: false });
    
    if (merchantId) {
      const id = parseInt(merchantId);
      if (!isNaN(id)) {
        query = query.eq('global_merchant_id', id);
      }
    } else if (ungrouped) {
      query = query.is('global_merchant_id', null);
    }
    
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        query = query.limit(limitNum);
      }
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({ patterns: data || [] });
  } catch (error: any) {
    console.error('Error fetching global merchant patterns:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch global merchant patterns' },
      { status: 500 }
    );
  }
}
