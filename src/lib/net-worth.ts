import { differenceInCalendarMonths, parseISO } from 'date-fns';
import type { Account, CreditCard, Loan, NonCashAsset } from '@/lib/types';

export interface NetWorthBreakdown {
  totalAccounts: number;
  totalCreditCards: number;
  totalLoans: number;
  totalAssets: number;
  netWorth: number;
}

/**
 * Net worth = cash accounts (included in totals) + non-cash assets − credit card balances − loans (included in net worth).
 * Matches `createNetWorthSnapshot` in account-balance-audit.
 */
export function computeNetWorthBreakdown(
  accounts: Pick<Account, 'balance' | 'include_in_totals'>[],
  creditCards: Pick<CreditCard, 'current_balance'>[],
  loans: Pick<Loan, 'balance' | 'include_in_net_worth'>[],
  assets: Pick<NonCashAsset, 'current_value'>[]
): NetWorthBreakdown {
  const totalAccounts = accounts
    .filter((acc) => acc.include_in_totals === true)
    .reduce((sum, acc) => sum + Number(acc.balance || 0), 0);

  const totalCreditCards = creditCards.reduce(
    (sum, cc) => sum + Number(cc.current_balance || 0),
    0
  );

  const totalLoans = loans
    .filter((loan) => loan.include_in_net_worth === true)
    .reduce((sum, loan) => sum + Number(loan.balance || 0), 0);

  const totalAssets = assets.reduce(
    (sum, asset) => sum + Number(asset.current_value || 0),
    0
  );

  const netWorth = totalAccounts + totalAssets - totalCreditCards - totalLoans;

  return {
    totalAccounts,
    totalCreditCards,
    totalLoans,
    totalAssets,
    netWorth,
  };
}

export interface NetWorthSnapshotPoint {
  snapshot_date: string;
  net_worth: number;
}

/**
 * From snapshots sorted ascending by date, pick the latest snapshot on or before (today − daysAgo).
 */
export function findBaselineSnapshotNearDaysAgo<T extends NetWorthSnapshotPoint>(
  snapshotsAscending: T[],
  daysAgo: number
): T | null {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysAgo);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  let best: T | null = null;
  for (const s of snapshotsAscending) {
    if (s.snapshot_date <= cutoffStr) {
      best = s;
    }
  }
  return best;
}

export function computePercentChange(from: number, to: number): number | null {
  if (from === 0) {
    return null;
  }
  return ((to - from) / Math.abs(from)) * 100;
}

/** When first-to-last snapshot span is below this (in calendar months), chart uses monthly buckets. */
export const NET_WORTH_MONTHLY_CHART_MAX_SPAN_MONTHS = 18;

/**
 * Calendar months between the first and last snapshot (0 if fewer than 2 points).
 * Snapshots must be sorted ascending by `snapshot_date`.
 */
export function snapshotHistorySpanMonths(
  snapshotsSortedAsc: { snapshot_date: string }[]
): number {
  if (snapshotsSortedAsc.length < 2) {
    return 0;
  }
  const first = parseISO(snapshotsSortedAsc[0].snapshot_date);
  const last = parseISO(snapshotsSortedAsc[snapshotsSortedAsc.length - 1].snapshot_date);
  return Math.max(0, differenceInCalendarMonths(last, first));
}

/**
 * One point per calendar month: uses the last snapshot in that month (dates ascending).
 */
export function aggregateNetWorthSnapshotsByMonth<T extends NetWorthSnapshotPoint>(
  snapshotsSortedAsc: T[]
): { date: string; netWorth: number }[] {
  const byMonth = new Map<string, { date: string; netWorth: number }>();
  for (const s of snapshotsSortedAsc) {
    const monthKey = s.snapshot_date.slice(0, 7);
    byMonth.set(monthKey, {
      date: s.snapshot_date,
      netWorth: Number(s.net_worth) || 0,
    });
  }
  return Array.from(byMonth.keys())
    .sort()
    .map((k) => byMonth.get(k)!);
}

export type NetWorthChartGranularity = 'day' | 'month';

export function buildNetWorthChartSeries<T extends NetWorthSnapshotPoint>(
  snapshots: T[]
): { points: { date: string; netWorth: number }[]; granularity: NetWorthChartGranularity } {
  const sorted = [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
  const spanMonths = snapshotHistorySpanMonths(sorted);

  if (sorted.length === 0) {
    return { points: [], granularity: 'day' };
  }

  if (spanMonths < NET_WORTH_MONTHLY_CHART_MAX_SPAN_MONTHS) {
    return {
      points: aggregateNetWorthSnapshotsByMonth(sorted),
      granularity: 'month',
    };
  }

  return {
    points: sorted.map((s) => ({
      date: s.snapshot_date,
      netWorth: Number(s.net_worth) || 0,
    })),
    granularity: 'day',
  };
}
