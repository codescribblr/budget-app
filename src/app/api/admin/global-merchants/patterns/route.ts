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
    const page = searchParams.get('page');
    const search = searchParams.get('search') || searchParams.get('q'); // Support both 'search' and 'q'
    
    let query = supabase
      .from('global_merchant_patterns')
      .select(`
        *,
        global_merchants (
          id,
          display_name,
          status
        )
      `, { count: 'exact' })
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
    
    // Handle search query - filter by pattern text
    if (search && search.trim()) {
      query = query.ilike('pattern', `%${search.trim()}%`);
    }
    
    // Handle pagination
    if (page && limit) {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      if (!isNaN(pageNum) && pageNum > 0 && !isNaN(limitNum) && limitNum > 0) {
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;
        query = query.range(from, to);
      }
    } else if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        query = query.limit(limitNum);
      }
    } else {
      // Set a high default limit to avoid Supabase's default 1000 row limit
      // This allows admins to see all patterns without pagination
      query = query.limit(50000);
    }
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({ 
      patterns: data || [],
      total: count || 0,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : (data?.length || 0)
    });
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
