'use client';

import { useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Category } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CategoryDayOfWeekSpendingProps {
  transactions: TransactionWithSplits[];
  category: Category;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function CategoryDayOfWeekSpending({ transactions, category }: CategoryDayOfWeekSpendingProps) {
  const chartData = useMemo(() => {
    // Group transactions by day of week
    const dayData = new Map<number, { total: number; count: number }>();

    transactions.forEach(transaction => {
      const categorySplit = transaction.splits.find(s => s.category_id === category.id);
      if (!categorySplit) return;

      // Get day of week (0 = Sunday, 6 = Saturday)
      const date = new Date(transaction.date);
      const dayOfWeek = date.getDay();

      const amount = transaction.transaction_type === 'expense'
        ? categorySplit.amount
        : -categorySplit.amount;

      if (amount > 0) {
        const current = dayData.get(dayOfWeek) || { total: 0, count: 0 };
        dayData.set(dayOfWeek, {
          total: current.total + amount,
          count: current.count + 1,
        });
      }
    });

    // Convert to array format for recharts, ordered Sunday-Saturday
    const data = Array.from({ length: 7 }, (_, dayIndex) => {
      const dayStats = dayData.get(dayIndex) || { total: 0, count: 0 };
      return {
        day: DAYS_OF_WEEK[dayIndex],
        dayIndex,
        total: dayStats.total,
        average: dayStats.count > 0 ? dayStats.total / dayStats.count : 0,
        count: dayStats.count,
      };
    });

    return data;
  }, [transactions, category.id]);

  const totalSpent = chartData.reduce((sum, d) => sum + d.total, 0);
  const highestDay = chartData.reduce((max, d) => d.total > max.total ? d : max, chartData[0] || { total: 0, day: '' });
  const lowestDay = chartData.reduce((min, d) => d.total < min.total ? d : min, chartData[0] || { total: Infinity, day: '' });

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <div className="font-semibold mb-2 text-foreground">{data.day}</div>
          <div className="text-sm space-y-1">
            <div className="font-medium text-foreground">Total: {formatCurrency(data.total)}</div>
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
          <div className="text-xs md:text-sm text-muted-foreground">Highest Day</div>
          <div className="text-base md:text-2xl font-bold">{formatCurrency(highestDay?.total || 0)}</div>
          <div className="text-xs text-muted-foreground">{highestDay?.day}</div>
        </div>
        <div className="p-2 md:p-4 bg-muted rounded-lg">
          <div className="text-xs md:text-sm text-muted-foreground">Lowest Day</div>
          <div className="text-base md:text-2xl font-bold">{formatCurrency(lowestDay?.total || 0)}</div>
          <div className="text-xs text-muted-foreground">{lowestDay?.day}</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
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
          <Bar
            dataKey="total"
            fill="#0088FE"
            name="Total Spending"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


