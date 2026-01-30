import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/notifications/users
 * Search users for targeting
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = createServiceRoleClient();

    // List users (Supabase Admin API)
    // Note: Supabase Admin API doesn't support filtering, so we fetch and filter client-side
    // For better performance with many users, consider implementing server-side filtering
    const { data: usersData, error } = await supabase.auth.admin.listUsers({
      perPage: limit * 2, // Fetch more to account for filtering
    });

    if (error) {
      throw error;
    }

    // Filter by search term if provided
    let filteredUsers = usersData.users;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = usersData.users.filter(
        (user) =>
          user.email?.toLowerCase().includes(searchLower) ||
          user.id.toLowerCase().includes(searchLower)
      );
    }

    // Limit results
    filteredUsers = filteredUsers.slice(0, limit);

    const users = filteredUsers.map((user) => ({
      id: user.id,
      email: user.email || 'No email',
      createdAt: user.created_at,
    }));

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
