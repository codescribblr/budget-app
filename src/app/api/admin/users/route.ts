import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export interface AdminUserListItem {
  id: string;
  email: string | null;
  createdAt: string;
  verified: boolean;
  lastSignInAt: string | null;
  isAdmin: boolean;
  wizardCompleted: boolean;
  isPremium: boolean;
  subscriptionStatus: string | null;
  trialEnd: string | null;
  subscriptionEnd: string | null;
  isTrialing: boolean;
  active: boolean; // recent login (e.g. within 30 days)
}

const ACTIVE_DAYS = 30;

/**
 * GET /api/admin/users
 * List all users with status for admin
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const perPage = Math.min(100, Math.max(10, parseInt(searchParams.get('perPage') || '50')));
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();

    // 1. List auth users (paginated)
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.listUsers({
      page,
      perPage: Math.min(perPage * 2, 1000), // fetch extra for filtering
    });

    if (authError) {
      throw authError;
    }

    let users = authData.users;
    if (search) {
      users = users.filter(
        (u) =>
          u.email?.toLowerCase().includes(search) ||
          u.id.toLowerCase().includes(search)
      );
    }
    users = users.slice(0, perPage);

    if (users.length === 0) {
      return NextResponse.json({
        users: [],
        total: authData.total ?? 0,
        page,
        perPage,
      });
    }

    const userIds = users.map((u) => u.id);

    // 2. User profiles (is_admin) - admin can view all with regular client
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, is_admin')
      .in('user_id', userIds);

    const profileMap = new Map<string, { is_admin: boolean }>();
    profiles?.forEach((p) => profileMap.set(p.user_id, { is_admin: p.is_admin }));

    // 3. Subscriptions: user_subscriptions join budget_accounts to get owner_id
    const { data: accounts } = await serviceSupabase
      .from('budget_accounts')
      .select('id, owner_id')
      .in('owner_id', userIds);

    const accountIdsByOwner = new Map<string, number[]>();
    accounts?.forEach((a) => {
      const list = accountIdsByOwner.get(a.owner_id) || [];
      list.push(a.id);
      accountIdsByOwner.set(a.owner_id, list);
    });

    const allAccountIds = accounts?.map((a) => a.id) ?? [];
    let subscriptions: { account_id: number; status: string; tier: string; trial_end: string | null; current_period_end: string | null }[] = [];
    if (allAccountIds.length > 0) {
      const { data: subData } = await serviceSupabase
        .from('user_subscriptions')
        .select('account_id, status, tier, trial_end, current_period_end')
        .in('account_id', allAccountIds);
      subscriptions = subData ?? [];
    }

    const subByAccountId = new Map<number, (typeof subscriptions)[0]>();
    subscriptions?.forEach((s) => subByAccountId.set(s.account_id, s));

    const userSubMap = new Map<
      string,
      { status: string; tier: string; trial_end: string | null; current_period_end: string | null }
    >();
    accounts?.forEach((a) => {
      const sub = subByAccountId.get(a.id);
      if (sub) {
        const existing = userSubMap.get(a.owner_id);
        if (!existing || sub.status === 'active' || sub.status === 'trialing') {
          userSubMap.set(a.owner_id, {
            status: sub.status,
            tier: sub.tier,
            trial_end: sub.trial_end,
            current_period_end: sub.current_period_end,
          });
        }
      }
    });

    // 4. Wizard completed: settings where key = 'budget_wizard_completed'
    const { data: wizardSettings } = await serviceSupabase
      .from('settings')
      .select('user_id')
      .eq('key', 'budget_wizard_completed');

    const wizardUserIds = new Set((wizardSettings ?? []).map((s) => s.user_id));

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ACTIVE_DAYS);
    const cutoffIso = cutoff.toISOString();

    const list: AdminUserListItem[] = users.map((u) => {
      const profile = profileMap.get(u.id);
      const sub = userSubMap.get(u.id);
      const isPremium = !!(
        sub && ['active', 'trialing'].includes(sub.status) && sub.tier === 'premium'
      );
      const isTrialing = sub?.status === 'trialing' || false;

      return {
        id: u.id,
        email: u.email ?? null,
        createdAt: u.created_at,
        verified: !!u.email_confirmed_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        isAdmin: profile?.is_admin ?? false,
        wizardCompleted: wizardUserIds.has(u.id),
        isPremium,
        subscriptionStatus: sub?.status ?? null,
        trialEnd: sub?.trial_end ?? null,
        subscriptionEnd: sub?.current_period_end ?? null,
        isTrialing,
        active: !!(u.last_sign_in_at && u.last_sign_in_at >= cutoffIso),
      };
    });

    return NextResponse.json({
      users: list,
      total: authData.total ?? list.length,
      page,
      perPage,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error listing admin users:', err);
    if (err.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
