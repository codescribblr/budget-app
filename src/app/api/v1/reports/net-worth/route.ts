import { NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import { getExternalDb } from '@/lib/external-api/query-helpers';
import {
  computeNetWorthBreakdown,
  findBaselineSnapshotNearDaysAgo,
  computePercentChange,
} from '@/lib/net-worth';

export const GET = withExternalApi('reports', async (_request, context) => {
  const supabase = getExternalDb();
  const budgetAccountId = context.budgetAccountId;

  const [accountsRes, creditCardsRes, loansRes, assetsRes, snapshotsRes] = await Promise.all([
    supabase.from('accounts').select('balance, include_in_totals').eq('account_id', budgetAccountId),
    supabase.from('credit_cards').select('current_balance').eq('account_id', budgetAccountId),
    supabase.from('loans').select('balance, include_in_net_worth').eq('account_id', budgetAccountId),
    supabase.from('non_cash_assets').select('current_value').eq('account_id', budgetAccountId),
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
  if (err) throw err;

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
  let change30Days = null;
  if (baseline) {
    change30Days = {
      amount: current.netWorth - baseline.net_worth,
      percent: computePercentChange(baseline.net_worth, current.netWorth),
      baselineDate: baseline.snapshot_date,
      baselineNetWorth: baseline.net_worth,
    };
  }

  return NextResponse.json(
    externalApiData(
      {
        current,
        change30Days,
        snapshotCount: snapshotsAsc.length,
      },
      context
    )
  );
});
