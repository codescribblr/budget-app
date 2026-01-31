import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/global-merchants/active
 * Get all active global merchants (for user transaction override dropdown)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: merchants, error } = await supabase
      .from('global_merchants')
      .select('id, display_name, logo_url, icon_name')
      .eq('status', 'active')
      .order('display_name');
    
    if (error) throw error;
    
    return NextResponse.json({ merchants: merchants || [] });
  } catch (error: any) {
    console.error('Error fetching active global merchants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active merchants' },
      { status: 500 }
    );
  }
}
