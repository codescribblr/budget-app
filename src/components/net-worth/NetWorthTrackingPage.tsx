'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { buildNetWorthChartSeries, NET_WORTH_MONTHLY_CHART_MAX_SPAN_MONTHS } from '@/lib/net-worth';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NetWorthSummaryResponse {
  current: {
    netWorth: number;
    totalAccounts: number;
    totalCreditCards: number;
    totalLoans: number;
    totalAssets: number;
  };
  change30Days: {
    amount: number;
    percent: number | null;
    baselineDate: string;
    baselineNetWorth: number;
  } | null;
  snapshotCount: number;
}

interface SnapshotRow {
  snapshot_date: string;
  net_worth: number;
  total_accounts: number;
  total_credit_cards: number;
  total_loans: number;
  total_assets: number;
}

export default function NetWorthTrackingPage() {
  const [summary, setSummary] = useState<NetWorthSummaryResponse | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryRes, snapsRes] = await Promise.all([
        fetch('/api/net-worth/summary'),
        fetch('/api/net-worth-snapshots'),
      ]);

      if (!summaryRes.ok) {
        const body = await summaryRes.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load summary');
      }
      if (!snapsRes.ok) {
        const body = await snapsRes.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load history');
      }

      const summaryJson = (await summaryRes.json()) as NetWorthSummaryResponse;
      const snapsJson = (await snapsRes.json()) as SnapshotRow[];
      setSummary(summaryJson);
      setSnapshots(Array.isArray(snapsJson) ? snapsJson : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold">Net worth</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {error || 'Unable to load net worth.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { current, change30Days } = summary;
  const positive30 = change30Days ? change30Days.amount >= 0 : true;

  const { points: chartData, granularity: chartGranularity } = buildNetWorthChartSeries(snapshots);
  const chartSubtitle =
    chartData.length === 0
      ? null
      : chartGranularity === 'month'
        ? `By month (last snapshot in each month). With less than ${NET_WORTH_MONTHLY_CHART_MAX_SPAN_MONTHS} months of history, the chart uses monthly points.`
        : 'By day from daily snapshots.';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Net worth</h1>
          <p className="text-muted-foreground mt-1">
            Cash accounts and non-cash assets minus credit cards and loans included in net worth.
          </p>
        </div>
        <Button variant="outline" size="sm" className="self-start" asChild>
          <Link href="/reports/retirement-planning">
            Retirement forecast
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="md:col-span-2 lg:col-span-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">Current net worth</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl md:text-4xl font-bold tabular-nums">{formatCurrency(current.netWorth)}</p>
            {change30Days ? (
              <p
                className={cn(
                  'mt-2 text-sm font-medium inline-flex items-center gap-1.5 tabular-nums',
                  positive30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}
              >
                {positive30 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {positive30 ? '+' : ''}
                {formatCurrency(change30Days.amount)} ({positive30 ? '+' : ''}
                {change30Days.percent != null ? `${change30Days.percent.toFixed(1)}%` : '—'}) vs. ~30 days ago
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {summary.snapshotCount === 0
                  ? '30-day change will appear here as we capture your net worth history over time.'
                  : '30-day change will show once there is a snapshot from about a month ago.'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cash accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold tabular-nums">{formatCurrency(current.totalAccounts)}</p>
            <CardDescription className="mt-1">Included in totals</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Non-cash assets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold tabular-nums">{formatCurrency(current.totalAssets)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Credit cards</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold tabular-nums text-red-600 dark:text-red-400">
              −{formatCurrency(current.totalCreditCards)}
            </p>
            <CardDescription className="mt-1">Balances owed</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Loans</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold tabular-nums text-red-600 dark:text-red-400">
              −{formatCurrency(current.totalLoans)}
            </p>
            <CardDescription className="mt-1">Included in net worth</CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Net worth over time</CardTitle>
          <CardDescription>
            {chartData.length === 0
              ? 'History is built from automated snapshots when your balances change.'
              : chartSubtitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12 max-w-md mx-auto leading-relaxed">
              This chart will become available as we capture your net worth history over time. Values come from
              automated snapshots when account, card, loan, or asset balances change.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) =>
                    chartGranularity === 'month'
                      ? format(parseISO(v), 'MMM yyyy')
                      : format(parseISO(v), 'MMM d')
                  }
                  minTickGap={chartGranularity === 'month' ? 8 : 20}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => formatCurrency(Number(v))}
                  width={72}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as (typeof chartData)[0];
                    const title =
                      chartGranularity === 'month'
                        ? format(parseISO(row.date), 'MMMM yyyy')
                        : format(parseISO(row.date), 'MMM d, yyyy');
                    return (
                      <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
                        <div className="font-medium">{title}</div>
                        {chartGranularity === 'month' && (
                          <div className="text-xs text-muted-foreground">Last snapshot in month</div>
                        )}
                        <div className="tabular-nums">Net worth: {formatCurrency(row.netWorth)}</div>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  name="Net worth"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
