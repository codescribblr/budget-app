import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export interface AdminUserDetail {
  id: string;
  email: string | null;
  createdAt: string;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  lastActivityAt: string | null;
  isAdmin: boolean;
  birthYear: number | null;
  wizardCompleted: boolean;
  accounts: Array<{
    id: number;
    name: string;
    isOwner: boolean;
    subscription: {
      status: string;
      tier: string;
      trialStart: string | null;
      trialEnd: string | null;
      currentPeriodEnd: string | null;
    } | null;
  }>;
  aiUsage: {
    today: Record<string, { used: number; limit?: number }>;
    allTime: Record<string, number>;
    totalRequests: number;
  };
}

/**
 * GET /api/admin/users/[id]
 * Get detailed user info for admin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const serviceSupabase = createServiceRoleClient();

    // 1. Auth user
    const { data: authUser, error: authError } =
      await serviceSupabase.auth.admin.getUserById(userId);

    if (authError || !authUser.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const u = authUser.user;

    // 2. User profile
    const { data: profile } = await serviceSupabase
      .from('user_profiles')
      .select('is_admin, birth_year')
      .eq('user_id', userId)
      .single();

    // 3. Wizard completed
    const { data: wizardRows } = await serviceSupabase
      .from('settings')
      .select('account_id')
      .eq('user_id', userId)
      .eq('key', 'budget_wizard_completed');
    const wizardCompleted = (wizardRows?.length ?? 0) > 0;

    // 4. Accounts (budget_accounts where owner or account_users member)
    const { data: ownedAccounts } = await serviceSupabase
      .from('budget_accounts')
      .select('id, name, owner_id')
      .eq('owner_id', userId)
      .is('deleted_at', null);

    const { data: memberRows } = await serviceSupabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    const memberAccountIds = new Set((memberRows ?? []).map((r) => r.account_id));
    const allAccountIds = new Set<number>();
    (ownedAccounts ?? []).forEach((a) => allAccountIds.add(a.id));
    memberAccountIds.forEach((id) => allAccountIds.add(id));

    const accountIdList = Array.from(allAccountIds);
    const { data: allAccounts } =
      accountIdList.length > 0
        ? await serviceSupabase
            .from('budget_accounts')
            .select('id, name, owner_id')
            .in('id', accountIdList)
            .is('deleted_at', null)
        : { data: [] };

    const { data: subs } =
      accountIdList.length > 0
        ? await serviceSupabase
            .from('user_subscriptions')
            .select('account_id, status, tier, trial_start, trial_end, current_period_end')
            .in('account_id', accountIdList)
        : { data: [] };

    const subByAccountId = new Map(
      (subs ?? []).map((s) => [s.account_id, s])
    );

    const accounts = (allAccounts ?? []).map((acc) => ({
      id: acc.id,
      name: acc.name ?? 'Unnamed',
      isOwner: acc.owner_id === userId,
      subscription: (() => {
        const sub = subByAccountId.get(acc.id);
        if (!sub) return null;
        return {
          status: sub.status,
          tier: sub.tier,
          trialStart: sub.trial_start ?? null,
          trialEnd: sub.trial_end ?? null,
          currentPeriodEnd: sub.current_period_end ?? null,
        };
      })(),
    }));

    // 5. AI usage: today counts and all-time by feature_type
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const { data: todayUsage } = await serviceSupabase
      .from('ai_usage_tracking')
      .select('feature_type')
      .eq('user_id', userId)
      .gte('timestamp', todayIso);

    const todayCounts: Record<string, number> = {};
    todayUsage?.forEach((r) => {
      todayCounts[r.feature_type] = (todayCounts[r.feature_type] ?? 0) + 1;
    });

    const { data: allTimeUsage } = await serviceSupabase
      .from('ai_usage_tracking')
      .select('feature_type')
      .eq('user_id', userId);

    const allTimeCounts: Record<string, number> = {};
    let totalRequests = 0;
    allTimeUsage?.forEach((r) => {
      allTimeCounts[r.feature_type] = (allTimeCounts[r.feature_type] ?? 0) + 1;
      totalRequests += 1;
    });

    const { data: activityRows } = await serviceSupabase.rpc('get_user_last_activity', {
      user_ids: [userId],
    });
    const appActivityAt =
      activityRows?.length > 0 ? activityRows[0].last_activity ?? null : null;
    const signInAt = u.last_sign_in_at ?? null;
    const lastActivityAt =
      appActivityAt && signInAt
        ? (appActivityAt >= signInAt ? appActivityAt : signInAt)
        : appActivityAt ?? signInAt;

    const detail: AdminUserDetail = {
      id: u.id,
      email: u.email ?? null,
      createdAt: u.created_at,
      emailConfirmedAt: u.email_confirmed_at ?? null,
      lastSignInAt: u.last_sign_in_at ?? null,
      lastActivityAt,
      isAdmin: profile?.is_admin ?? false,
      birthYear: profile?.birth_year ?? null,
      wizardCompleted,
      accounts,
      aiUsage: {
        today: {
          chat: { used: todayCounts.chat ?? 0, limit: 15 },
          categorization: { used: todayCounts.categorization ?? 0, limit: 5 },
          dashboard_insights: { used: todayCounts.dashboard_insights ?? 0, limit: 1 },
          insights: { used: todayCounts.insights ?? 0 },
          reports: { used: todayCounts.reports ?? 0 },
          prediction: { used: todayCounts.prediction ?? 0 },
        },
        allTime: allTimeCounts,
        totalRequests,
      },
    };

    return NextResponse.json(detail);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error fetching admin user detail:', err);
    if (err.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}
