import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/global-merchants/search
 * Search global merchants (for merge dropdown)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    
    let supabaseQuery = supabase
      .from('global_merchants')
      .select('id, display_name, logo_url, icon_name')
      .order('display_name')
      .limit(50);
    
    if (query) {
      supabaseQuery = supabaseQuery.ilike('display_name', `%${query}%`);
    }
    
    const { data, error } = await supabaseQuery;
    
    if (error) throw error;
    
    return NextResponse.json({ merchants: data || [] });
  } catch (error: any) {
    console.error('Error searching global merchants:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to search merchants' },
      { status: 500 }
    );
  }
}
