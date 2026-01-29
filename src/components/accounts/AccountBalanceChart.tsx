'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface BalanceDataPoint {
  date: string;
  balance: number;
}

interface AccountBalanceChartProps {
  accountId: number;
}

export default function AccountBalanceChart({ accountId }: AccountBalanceChartProps) {
  const [data, setData] = useState<BalanceDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalanceHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/accounts/${accountId}/balance-history`);
        if (!response.ok) {
          throw new Error('Failed to fetch balance history');
        }
        const history = await response.json();
        
        // Transform audit records into chart data
        // Group by date and use the latest balance for each date
        const balanceMap = new Map<string, number>();
        
        history.forEach((record: any) => {
          const date = record.created_at.split('T')[0];
          // Use new_balance as it represents the balance after the change
          balanceMap.set(date, record.new_balance);
        });
        
        // Convert to array and sort by date
        const chartData: BalanceDataPoint[] = Array.from(balanceMap.entries())
          .map(([date, balance]) => ({
            date,
            balance: Number(balance),
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
        
        setData(chartData);
      } catch (error) {
        console.error('Error fetching balance history:', error);
      } finally {
        setLoading(false);
      }
    };

    if (accountId) {
      fetchBalanceHistory();
    }
  }, [accountId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            No balance history available yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => format(parseISO(value), 'MMM d')}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as BalanceDataPoint;
                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3">
                      <div className="font-semibold mb-2 text-foreground">
                        {format(parseISO(data.date), 'MMM d, yyyy')}
                      </div>
                      <div className="text-sm text-foreground">
                        Balance: {formatCurrency(data.balance)}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#0088FE"
              strokeWidth={2}
              name="Balance"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
