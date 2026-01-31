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
    const filter = searchParams.get('filter'); // 'all', 'ungrouped', 'grouped'
    const ungrouped = searchParams.get('ungrouped') === 'true'; // Legacy support
    const limit = searchParams.get('limit');
    
    let query = supabase
      .from('global_merchant_patterns')
      .select(`
        *,
        global_merchants (
          id,
          display_name,
          status
        )
      `)
      .order('usage_count', { ascending: false });
    
    // Handle merchant_id filter (takes precedence)
    if (merchantId) {
      const id = parseInt(merchantId);
      if (!isNaN(id)) {
        query = query.eq('global_merchant_id', id);
      }
    } else {
      // Handle filter parameter (new way)
      if (filter === 'ungrouped') {
        query = query.is('global_merchant_id', null);
      } else if (filter === 'grouped') {
        query = query.not('global_merchant_id', 'is', null);
      }
      // 'all' or no filter shows everything (default behavior)
      
      // Legacy support for ungrouped parameter
      if (!filter && ungrouped) {
        query = query.is('global_merchant_id', null);
      }
    }
    
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        query = query.limit(limitNum);
      }
    } else {
      // Set a high default limit to avoid Supabase's default 1000 row limit
      // This allows admins to see all patterns without pagination
      query = query.limit(50000);
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
