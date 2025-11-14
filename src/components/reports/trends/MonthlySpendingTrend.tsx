'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Category } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface MonthlySpendingTrendProps {
  transactions: TransactionWithSplits[];
  categories: Category[];
}

export default function MonthlySpendingTrend({ transactions, categories }: MonthlySpendingTrendProps) {
  const chartData = useMemo(() => {
    // Group transactions by month
    const monthlyData = new Map<string, { total: number; count: number }>();

    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      // Sum only splits that are NOT in system categories
      const nonSystemTotal = transaction.splits.reduce((sum, split) => {
        const category = categories.find(c => c.id === split.category_id);
        if (category && !category.is_system) {
          return sum + split.amount;
        }
        return sum;
      }, 0);

      // Only add to monthly data if there are non-system splits
      if (nonSystemTotal > 0) {
        const current = monthlyData.get(monthKey) || { total: 0, count: 0 };
        monthlyData.set(monthKey, {
          total: current.total + nonSystemTotal,
          count: current.count + 1,
        });
      }
    });

    // Convert to array and sort by date
    const data = Array.from(monthlyData.entries())
      .map(([month, stats]) => {
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        return {
          month: monthName,
          monthKey: month,
          total: stats.total,
          count: stats.count,
          average: stats.total / stats.count,
        };
      })
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    return data;
  }, [transactions, categories]);

  const totalSpent = chartData.reduce((sum, d) => sum + d.total, 0);
  const averageMonthly = chartData.length > 0 ? totalSpent / chartData.length : 0;
  const highestMonth = chartData.reduce((max, d) => d.total > max.total ? d : max, chartData[0] || { total: 0, month: '' });
  const lowestMonth = chartData.reduce((min, d) => d.total < min.total ? d : min, chartData[0] || { total: Infinity, month: '' });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Spending Trend</CardTitle>
        <CardDescription>
          Total spending by month • Average: {formatCurrency(averageMonthly)}/month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Total Spent</div>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Highest Month</div>
            <div className="text-2xl font-bold">{formatCurrency(highestMonth?.total || 0)}</div>
            <div className="text-xs text-muted-foreground">{highestMonth?.month}</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Lowest Month</div>
            <div className="text-2xl font-bold">{formatCurrency(lowestMonth?.total || 0)}</div>
            <div className="text-xs text-muted-foreground">{lowestMonth?.month}</div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
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
              tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
            />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              labelStyle={{ color: '#000' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#0088FE" 
              strokeWidth={2}
              name="Total Spending"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

