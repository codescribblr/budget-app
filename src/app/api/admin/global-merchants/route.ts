import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/global-merchants
 * Get all global merchants (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'active', 'draft', or null for all
    
    let query = supabase
      .from('global_merchants')
      .select('*')
      .order('display_name');
    
    if (status === 'active' || status === 'draft') {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({ merchants: data || [] });
  } catch (error: any) {
    console.error('Error fetching global merchants:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch global merchants' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/global-merchants
 * Create a new global merchant (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAdmin();
    const supabase = await createClient();
    const body = await request.json();
    const { display_name, status = 'draft', logo_url, icon_name } = body;
    
    if (!display_name || typeof display_name !== 'string') {
      return NextResponse.json(
        { error: 'Display name is required' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('global_merchants')
      .insert({
        display_name: display_name.trim(),
        status: status === 'active' ? 'active' : 'draft',
        logo_url: logo_url || null,
        icon_name: icon_name || null,
        created_by: user.id,
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'A merchant with this name already exists' },
          { status: 400 }
        );
      }
      throw error;
    }
    
    return NextResponse.json({ merchant: data }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating global merchant:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to create global merchant' },
      { status: 500 }
    );
  }
}
