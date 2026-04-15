'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency, formatCurrencyAbbreviated } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { buildNetWorthChartSeries, NET_WORTH_MONTHLY_CHART_MAX_SPAN_MONTHS } from '@/lib/net-worth';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
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

type NetWorthChartPoint = { date: string; netWorth: number };

export default function NetWorthTrackingPage() {
  const areaFillGradientId = useId().replace(/:/g, '');
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
        ? `Bars show the last snapshot in each month (history under ${NET_WORTH_MONTHLY_CHART_MAX_SPAN_MONTHS} months). Axis labels are abbreviated.`
        : 'Area shows daily snapshots. Axis labels are abbreviated.';

  const showBarValueLabels = chartGranularity === 'month' && chartData.length <= 24;

  const yAxisTickFormatter = (v: number) => formatCurrencyAbbreviated(Number(v));

  const tooltipContent = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { payload: NetWorthChartPoint }[];
  }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
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
  };

  const xAxisTickFormatter = (v: string) =>
    chartGranularity === 'month' ? format(parseISO(v), 'MMM yyyy') : format(parseISO(v), 'MMM d');

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
          ) : chartGranularity === 'month' ? (
            <ResponsiveContainer width="100%" height={showBarValueLabels ? 400 : 360}>
              <BarChart
                data={chartData}
                margin={{ top: showBarValueLabels ? 28 : 12, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={xAxisTickFormatter}
                  minTickGap={8}
                  angle={chartData.length > 10 ? -32 : 0}
                  textAnchor={chartData.length > 10 ? 'end' : 'middle'}
                  height={chartData.length > 10 ? 56 : 32}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={yAxisTickFormatter}
                  width={56}
                  tickMargin={6}
                />
                <Tooltip
                  content={tooltipContent}
                  cursor={{ fill: 'var(--muted)', fillOpacity: 0.35 }}
                />
                <Bar
                  dataKey="netWorth"
                  name="Net worth"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={56}
                >
                  {showBarValueLabels && (
                    <LabelList
                      position="top"
                      offset={6}
                      className="fill-muted-foreground"
                      fontSize={10}
                      valueAccessor={(entry) => {
                        const row = entry.payload as NetWorthChartPoint;
                        return formatCurrencyAbbreviated(Number(row.netWorth));
                      }}
                    />
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <AreaChart data={chartData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id={areaFillGradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={xAxisTickFormatter}
                  minTickGap={20}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={yAxisTickFormatter}
                  width={56}
                  tickMargin={6}
                />
                <Tooltip content={tooltipContent} />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  name="Net worth"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill={`url(#${areaFillGradientId})`}
                  fillOpacity={1}
                  dot={false}
                  activeDot={{ r: 5, fill: 'var(--chart-1)', stroke: 'var(--background)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
