import { NextResponse } from 'next/server';
import { getActiveAccountId } from '@/lib/account-context';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { requireRetirementPlanningNetWorthAccess } from '@/lib/net-worth-api-guard';
import {
  computeNetWorthBreakdown,
  findBaselineSnapshotNearDaysAgo,
  computePercentChange,
} from '@/lib/net-worth';

export async function GET() {
  const denied = await requireRetirementPlanningNetWorthAccess();
  if (denied) return denied;

  try {
    const { supabase } = await getAuthenticatedUser();
    const budgetAccountId = await getActiveAccountId();
    if (!budgetAccountId) {
      return NextResponse.json({ error: 'No active account.' }, { status: 400 });
    }

    const [accountsRes, creditCardsRes, loansRes, assetsRes, snapshotsRes] = await Promise.all([
      supabase
        .from('accounts')
        .select('balance, include_in_totals')
        .eq('account_id', budgetAccountId),
      supabase
        .from('credit_cards')
        .select('current_balance')
        .eq('account_id', budgetAccountId),
      supabase
        .from('loans')
        .select('balance, include_in_net_worth')
        .eq('account_id', budgetAccountId),
      supabase
        .from('non_cash_assets')
        .select('current_value')
        .eq('account_id', budgetAccountId),
      supabase
        .from('net_worth_snapshots')
        .select('snapshot_date, net_worth')
        .eq('budget_account_id', budgetAccountId)
        .order('snapshot_date', { ascending: true }),
    ]);

    const err =
      accountsRes.error ||
      creditCardsRes.error ||
      loansRes.error ||
      assetsRes.error ||
      snapshotsRes.error;
    if (err) {
      console.error('Net worth summary query error:', err);
      return NextResponse.json({ error: 'Failed to load net worth data' }, { status: 500 });
    }

    const current = computeNetWorthBreakdown(
      accountsRes.data || [],
      creditCardsRes.data || [],
      loansRes.data || [],
      assetsRes.data || []
    );

    const snapshotsAsc = (snapshotsRes.data || []).map((s) => ({
      snapshot_date: s.snapshot_date as string,
      net_worth: Number(s.net_worth) || 0,
    }));

    const baseline = findBaselineSnapshotNearDaysAgo(snapshotsAsc, 30);
    let change30Days: {
      amount: number;
      percent: number | null;
      baselineDate: string;
      baselineNetWorth: number;
    } | null = null;

    if (baseline) {
      const amount = current.netWorth - baseline.net_worth;
      const percent = computePercentChange(baseline.net_worth, current.netWorth);
      change30Days = {
        amount,
        percent,
        baselineDate: baseline.snapshot_date,
        baselineNetWorth: baseline.net_worth,
      };
    }

    return NextResponse.json({
      current,
      change30Days,
      snapshotCount: snapshotsAsc.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Net worth summary error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
