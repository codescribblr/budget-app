'use client';

import { useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Category } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CategoryWeekOfMonthSpendingProps {
  transactions: TransactionWithSplits[];
  category: Category;
}

export default function CategoryWeekOfMonthSpending({ transactions, category }: CategoryWeekOfMonthSpendingProps) {
  const chartData = useMemo(() => {
    // Group transactions by week of month
    const weekData = new Map<number, { total: number; count: number }>();

    transactions.forEach(transaction => {
      const categorySplit = transaction.splits.find(s => s.category_id === category.id);
      if (!categorySplit) return;

      // Parse date and calculate week of month (1-5)
      const date = new Date(transaction.date);
      const dayOfMonth = date.getDate();
      const weekOfMonth = Math.ceil(dayOfMonth / 7);

      const amount = transaction.transaction_type === 'expense'
        ? categorySplit.amount
        : -categorySplit.amount;

      if (amount > 0) {
        const current = weekData.get(weekOfMonth) || { total: 0, count: 0 };
        weekData.set(weekOfMonth, {
          total: current.total + amount,
          count: current.count + 1,
        });
      }
    });

    // Convert to array format for recharts, ordered Week 1-5
    const data = Array.from({ length: 5 }, (_, weekIndex) => {
      const weekNumber = weekIndex + 1;
      const weekStats = weekData.get(weekNumber) || { total: 0, count: 0 };
      return {
        week: `Week ${weekNumber}`,
        weekNumber,
        total: weekStats.total,
        average: weekStats.count > 0 ? weekStats.total / weekStats.count : 0,
        count: weekStats.count,
      };
    });

    return data;
  }, [transactions, category.id]);

  const totalSpent = chartData.reduce((sum, d) => sum + d.total, 0);
  const highestWeek = chartData.reduce((max, d) => d.total > max.total ? d : max, chartData[0] || { total: 0, week: '' });
  const lowestWeek = chartData.reduce((min, d) => d.total < min.total ? d : min, chartData[0] || { total: Infinity, week: '' });

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <div className="font-semibold mb-2">{data.week}</div>
          <div className="text-sm space-y-1">
            <div className="font-medium">Total: {formatCurrency(data.total)}</div>
            <div className="text-xs text-muted-foreground">
              Average: {formatCurrency(data.average)}
            </div>
            <div className="text-xs text-muted-foreground">
              Transactions: {data.count}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
        <div className="p-2 md:p-4 bg-muted rounded-lg">
          <div className="text-xs md:text-sm text-muted-foreground">Total Spent</div>
          <div className="text-base md:text-2xl font-bold">{formatCurrency(totalSpent)}</div>
        </div>
        <div className="p-2 md:p-4 bg-muted rounded-lg">
          <div className="text-xs md:text-sm text-muted-foreground">Highest Week</div>
          <div className="text-base md:text-2xl font-bold">{formatCurrency(highestWeek?.total || 0)}</div>
          <div className="text-xs text-muted-foreground">{highestWeek?.week}</div>
        </div>
        <div className="p-2 md:p-4 bg-muted rounded-lg">
          <div className="text-xs md:text-sm text-muted-foreground">Lowest Week</div>
          <div className="text-base md:text-2xl font-bold">{formatCurrency(lowestWeek?.total || 0)}</div>
          <div className="text-xs text-muted-foreground">{lowestWeek?.week}</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="total"
            fill="#00C49F"
            name="Total Spending"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

