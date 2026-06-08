'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFeature } from '@/contexts/FeatureContext';
import { formatCurrency, cn } from '@/lib/utils';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';

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

export default function NetWorthSummaryCard() {
  const retirementPlanningEnabled = useFeature('retirement_planning');
  const [data, setData] = useState<NetWorthSummaryResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!retirementPlanningEnabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await fetch('/api/net-worth/summary');
        if (!res.ok) {
          if (!cancelled) setError(true);
          return;
        }
        const json = (await res.json()) as NetWorthSummaryResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [retirementPlanningEnabled]);

  if (!retirementPlanningEnabled) {
    return null;
  }

  if (loading) {
    return (
      <Card className="border-muted">
        <CardContent className="py-4 px-4 md:px-6 flex items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            <div className="h-8 w-40 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-9 w-28 rounded bg-muted animate-pulse shrink-0" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  const { current, change30Days } = data;
  const positive = change30Days ? change30Days.amount >= 0 : true;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="py-4 px-4 md:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Net worth
            </p>
            <p className="text-2xl md:text-3xl font-bold tabular-nums truncate">
              {formatCurrency(current.netWorth)}
            </p>
            {change30Days ? (
              <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 text-sm">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 font-medium tabular-nums',
                    positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {positive ? (
                    <TrendingUp className="h-4 w-4 shrink-0" aria-hidden />
                  ) : (
                    <TrendingDown className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                  {positive ? '+' : ''}
                  {formatCurrency(change30Days.amount)}
                </span>
                {change30Days.percent != null && (
                  <span
                    className={cn(
                      'font-medium tabular-nums pl-5 sm:pl-0',
                      positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {positive ? '+' : ''}
                    {change30Days.percent.toFixed(1)}%
                  </span>
                )}
                <span className="text-muted-foreground text-xs sm:text-sm">past 30 days</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {data.snapshotCount === 0
                  ? '30-day change will appear here as we capture your net worth history over time.'
                  : '30-day change will show once there is a snapshot from about a month ago.'}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" className="shrink-0 self-start sm:self-center" asChild>
            <Link href="/net-worth">
              Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
