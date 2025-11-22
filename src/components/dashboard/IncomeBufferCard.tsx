'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Wallet, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface IncomeBufferStatus {
  enabled: boolean;
  balance: number;
  monthsOfRunway: number;
  monthlyBudget: number;
  hasBeenFundedThisMonth: boolean;
  totalFundedThisMonth: number;
}

export default function IncomeBufferCard() {
  const [status, setStatus] = useState<IncomeBufferStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/income-buffer/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching income buffer status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Income Buffer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!status || !status.enabled) {
    return null;
  }

  const getRunwayColor = (months: number) => {
    if (months >= 3) return 'text-green-600 dark:text-green-400';
    if (months >= 1) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getRunwayBgColor = (months: number) => {
    if (months >= 3) return 'bg-green-50 dark:bg-green-950';
    if (months >= 1) return 'bg-yellow-50 dark:bg-yellow-950';
    return 'bg-red-50 dark:bg-red-950';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Income Buffer
        </CardTitle>
        <CardDescription>
          Smooth irregular income into regular monthly funding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Buffer Balance</div>
            <div className="text-2xl font-bold">{formatCurrency(status.balance)}</div>
          </div>
          <div className={`p-3 rounded-md ${getRunwayBgColor(status.monthsOfRunway)}`}>
            <div className="text-sm text-muted-foreground">Months of Runway</div>
            <div className={`text-2xl font-bold ${getRunwayColor(status.monthsOfRunway)}`}>
              {status.monthsOfRunway.toFixed(1)}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground mb-2">
            Monthly Budget: {formatCurrency(status.monthlyBudget)}
          </div>
          <Link href="/income-buffer">
            <Button variant="outline" className="w-full">
              <TrendingUp className="mr-2 h-4 w-4" />
              Manage Buffer
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

