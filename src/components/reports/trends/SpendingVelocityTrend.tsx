'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Category } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, ComposedChart } from 'recharts';

interface SpendingVelocityTrendProps {
  transactions: TransactionWithSplits[];
  categories: Category[];
}

export default function SpendingVelocityTrend({ transactions, categories }: SpendingVelocityTrendProps) {
  const chartData = useMemo(() => {
    // Group transactions by month
    const monthlyData = new Map<string, { total: number; days: number }>();

    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      // Sum only splits that are NOT in system categories
      // Expenses add, income subtracts
      const nonSystemTotal = transaction.splits.reduce((sum, split) => {
        const category = categories.find(c => c.id === split.category_id);
        if (category && !category.is_system) {
          const amount = transaction.transaction_type === 'expense'
            ? split.amount
            : -split.amount;
          return sum + amount;
        }
        return sum;
      }, 0);

      // Add to monthly data (can be positive or negative)
      const current = monthlyData.get(monthKey) || { total: 0, days: 0 };
      monthlyData.set(monthKey, {
        total: current.total + nonSystemTotal,
        days: new Date(parseInt(monthKey.split('-')[0]), parseInt(monthKey.split('-')[1]), 0).getDate(),
      });
    });

    // Convert to array and calculate daily average
    const data = Array.from(monthlyData.entries())
      .map(([month, stats]) => {
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        const dailyAverage = stats.total / stats.days;

        return {
          month: monthName,
          monthKey: month,
          total: stats.total,
          dailyAverage,
          days: stats.days,
        };
      })
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    return data;
  }, [transactions, categories]);

  const overallDailyAverage = chartData.length > 0
    ? chartData.reduce((sum, d) => sum + d.dailyAverage, 0) / chartData.length
    : 0;

  const highestVelocity = chartData.reduce(
    (max, d) => d.dailyAverage > max.dailyAverage ? d : max,
    chartData[0] || { dailyAverage: 0, month: '' }
  );

  const lowestVelocity = chartData.reduce(
    (min, d) => d.dailyAverage < min.dailyAverage ? d : min,
    chartData[0] || { dailyAverage: Infinity, month: '' }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending Velocity</CardTitle>
        <CardDescription>
          Average daily spending rate by month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Avg Daily Spending</div>
            <div className="text-2xl font-bold">{formatCurrency(overallDailyAverage)}</div>
            <div className="text-xs text-muted-foreground">per day</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Highest Velocity</div>
            <div className="text-2xl font-bold">{formatCurrency(highestVelocity?.dailyAverage || 0)}</div>
            <div className="text-xs text-muted-foreground">{highestVelocity?.month}</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Lowest Velocity</div>
            <div className="text-2xl font-bold">{formatCurrency(lowestVelocity?.dailyAverage || 0)}</div>
            <div className="text-xs text-muted-foreground">{lowestVelocity?.month}</div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3">
                      <div className="font-semibold mb-2 text-foreground">{label}</div>
                      <div className="text-sm space-y-1">
                        {payload.map((entry: any, index: number) => (
                          <div key={index} className="text-foreground">
                            {entry.name}: {formatCurrency(entry.value)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="dailyAverage"
              fill="#8884d8"
              stroke="#8884d8"
              fillOpacity={0.3}
              name="Daily Average"
            />
            <Line
              type="monotone"
              dataKey="dailyAverage"
              stroke="#0088FE"
              strokeWidth={2}
              name="Daily Spending Rate"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}


