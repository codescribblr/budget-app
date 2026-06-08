import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assetId = parseInt(id);
    
    if (isNaN(assetId)) {
      return NextResponse.json({ error: 'Invalid asset ID' }, { status: 400 });
    }

    const { supabase, user } = await getAuthenticatedUser();
    const budgetAccountId = await getActiveAccountId();
    
    if (!budgetAccountId) {
      return NextResponse.json(
        { error: 'No active account. Please select an account first.' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Fetch audit records
    const { data: auditRecords, error: auditError } = await supabase
      .from('asset_value_audit')
      .select('*')
      .eq('asset_id', assetId)
      .eq('budget_account_id', budgetAccountId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (auditError) {
      console.error('Error fetching audit trail:', auditError);
      return NextResponse.json(
        { error: 'Failed to fetch audit trail' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('asset_value_audit')
      .select('*', { count: 'exact', head: true })
      .eq('asset_id', assetId)
      .eq('budget_account_id', budgetAccountId);

    if (countError) {
      console.error('Error counting audit records:', countError);
    }

    // Fetch user emails using service role client
    const userIds = new Set<string>();
    (auditRecords || []).forEach((record: any) => {
      if (record.user_id) {
        userIds.add(record.user_id);
      }
    });

    const userEmailMap = new Map<string, string>();
    if (userIds.size > 0) {
      const adminSupabase = createServiceRoleClient();
      const { data: profiles } = await adminSupabase
        .from('user_profiles')
        .select('user_id, email')
        .in('user_id', Array.from(userIds));
      
      if (profiles) {
        profiles.forEach((profile: any) => {
          userEmailMap.set(profile.user_id, profile.email);
        });
      }
    }

    // Combine audit records with user data
    const records = (auditRecords || []).map((record: any) => ({
      ...record,
      user_email: record.user_id ? userEmailMap.get(record.user_id) || null : null,
    }));

    return NextResponse.json({
      records,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error: any) {
    console.error('Error in audit endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch audit trail' },
      { status: 500 }
    );
  }
}
