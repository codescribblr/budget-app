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
    // Group transactions by month with breakdown
    const monthlyData = new Map<string, {
      total: number;
      totalTransactions: number;
      categorizedTransactions: number;
      uncategorizedTransactions: number;
      systemTransactions: number;
    }>();

    // First pass: count all transactions by month
    const transactionsByMonth = new Map<string, TransactionWithSplits[]>();
    transactions.forEach(transaction => {
      // Extract month key directly from date string (YYYY-MM-DD format)
      // This avoids timezone issues with Date constructor
      const monthKey = transaction.date.substring(0, 7); // Gets "YYYY-MM"

      if (!transactionsByMonth.has(monthKey)) {
        transactionsByMonth.set(monthKey, []);
      }
      transactionsByMonth.get(monthKey)!.push(transaction);
    });

    // Second pass: calculate totals and breakdowns (excluding system-only transactions by default)
    transactionsByMonth.forEach((monthTransactions, monthKey) => {
      let total = 0;
      let categorizedCount = 0;
      let systemCount = 0;
      let uncategorizedCount = 0;

      monthTransactions.forEach(transaction => {
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

        total += nonSystemTotal;

        // Categorize transaction
        const hasCategorizedSplit = transaction.splits.some(split => {
          const category = categories.find(c => c.id === split.category_id);
          return category && !category.is_system;
        });

        const isSystemOnly = transaction.splits.every(split => {
          const category = categories.find(c => c.id === split.category_id);
          return category?.is_system;
        });

        if (hasCategorizedSplit) {
          categorizedCount++;
        } else if (isSystemOnly) {
          systemCount++;
        } else {
          uncategorizedCount++;
        }
      });

      // Total transactions excludes system-only transactions (matching reports page behavior)
      const totalTransactions = categorizedCount + uncategorizedCount;

      monthlyData.set(monthKey, {
        total,
        totalTransactions,
        categorizedTransactions: categorizedCount,
        uncategorizedTransactions: uncategorizedCount,
        systemTransactions: systemCount,
      });
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
          totalTransactions: stats.totalTransactions,
          categorizedTransactions: stats.categorizedTransactions,
          uncategorizedTransactions: stats.uncategorizedTransactions,
          systemTransactions: stats.systemTransactions,
        };
      })
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    return data;
  }, [transactions, categories]);

  const totalSpent = chartData.reduce((sum, d) => sum + d.total, 0);
  const averageMonthly = chartData.length > 0 ? totalSpent / chartData.length : 0;
  const highestMonth = chartData.reduce((max, d) => d.total > max.total ? d : max, chartData[0] || { total: 0, month: '' });
  const lowestMonth = chartData.reduce((min, d) => d.total < min.total ? d : min, chartData[0] || { total: Infinity, month: '' });

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <div className="font-semibold mb-2">{data.month}</div>
          <div className="text-sm space-y-1">
            <div className="font-medium">{formatCurrency(data.total)}</div>
            <div className="text-xs text-muted-foreground mt-2">
              <div>Total Transactions: {data.totalTransactions}</div>
              <div className="ml-2 space-y-0.5 mt-1">
                <div>• Categorized: {data.categorizedTransactions}</div>
                <div>• Uncategorized: {data.uncategorizedTransactions}</div>
                <div>• System: {data.systemTransactions}</div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

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
            <Tooltip content={<CustomTooltip />} />
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

