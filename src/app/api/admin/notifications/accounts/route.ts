import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/notifications/accounts
 * List all budget accounts for targeting
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let query = supabase
      .from('budget_accounts')
      .select('id, name, owner_id')
      .is('deleted_at', null);

    // Filter by search term if provided
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: accounts, error } = await query.order('name');

    if (error) {
      throw error;
    }

    // Enrich with owner email
    const enrichedAccounts = await Promise.all(
      (accounts || []).map(async (account) => {
        let ownerEmail = 'Unknown';
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(account.owner_id);
          ownerEmail = userData?.user?.email || 'Unknown';
        } catch (error) {
          console.error(`Error fetching owner ${account.owner_id}:`, error);
        }

        return {
          id: account.id.toString(),
          name: account.name || 'Unnamed Account',
          ownerEmail,
        };
      })
    );

    return NextResponse.json({ accounts: enrichedAccounts });
  } catch (error: any) {
    console.error('Error fetching accounts:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}
