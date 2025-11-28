'use client';

import { useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Category } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CategoryMonthlyTrendProps {
  transactions: TransactionWithSplits[];
  category: Category;
}

export default function CategoryMonthlyTrend({ transactions, category }: CategoryMonthlyTrendProps) {
  const chartData = useMemo(() => {
    // Group transactions by month for this category
    const monthlyData = new Map<string, number>();

    transactions.forEach(transaction => {
      const categorySplit = transaction.splits.find(s => s.category_id === category.id);
      if (!categorySplit) return;

      // Extract month key directly from date string (YYYY-MM-DD format)
      const monthKey = transaction.date.substring(0, 7); // Gets "YYYY-MM"

      const amount = transaction.transaction_type === 'expense'
        ? categorySplit.amount
        : -categorySplit.amount;

      const current = monthlyData.get(monthKey) || 0;
      monthlyData.set(monthKey, current + amount);
    });

    // Convert to array and sort by date
    const data = Array.from(monthlyData.entries())
      .map(([month, total]) => {
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        return {
          month: monthName,
          monthKey: month,
          total,
        };
      })
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    return data;
  }, [transactions, category.id]);

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
          <div className="font-medium">{formatCurrency(data.total)}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
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
            name="Spending"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

