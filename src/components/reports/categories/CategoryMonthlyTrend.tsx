'use client';

import { useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Category } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CategoryMonthlyTrendProps {
  transactions: TransactionWithSplits[];
  category: Category;
  startDate?: string;
  endDate?: string;
}

export default function CategoryMonthlyTrend({ transactions, category, startDate = '', endDate = '' }: CategoryMonthlyTrendProps) {
  const chartData = useMemo(() => {
    // Calculate number of months in the date range
    let monthCount = 0;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      monthCount = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    } else if (transactions.length > 0) {
      // Calculate from transaction dates if no date range provided
      const dates = transactions
        .map(t => t.date)
        .sort();
      if (dates.length > 0) {
        const firstDate = new Date(dates[0]);
        const lastDate = new Date(dates[dates.length - 1]);
        monthCount = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + (lastDate.getMonth() - firstDate.getMonth()) + 1;
      }
    }

    // If less than 2 months, show daily data instead
    const useDailyView = monthCount < 2;

    if (useDailyView) {
      // Group by day
      const dailyData = new Map<string, number>();

      transactions.forEach(transaction => {
        const categorySplit = transaction.splits.find(s => s.category_id === category.id);
        if (!categorySplit) return;

        const dayKey = transaction.date; // Use full date (YYYY-MM-DD)

        const amount = transaction.transaction_type === 'expense'
          ? categorySplit.amount
          : -categorySplit.amount;

        const current = dailyData.get(dayKey) || 0;
        dailyData.set(dayKey, current + amount);
      });

      // Convert to array and sort by date
      const data = Array.from(dailyData.entries())
        .map(([day, total]) => {
          const date = new Date(day);
          const dayName = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          return {
            day: dayName,
            dayKey: day,
            total,
          };
        })
        .sort((a, b) => a.dayKey.localeCompare(b.dayKey));

      return { data, isDaily: true };
    } else {
      // Group by month
      const monthlyData = new Map<string, number>();

      transactions.forEach(transaction => {
        const categorySplit = transaction.splits.find(s => s.category_id === category.id);
        if (!categorySplit) return;

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

      return { data, isDaily: false };
    }
  }, [transactions, category.id, startDate, endDate]);

  const { data: chartDataArray, isDaily } = chartData;
  const totalSpent = chartDataArray.reduce((sum: number, d: any) => sum + d.total, 0);
  const averagePeriod = chartDataArray.length > 0 ? totalSpent / chartDataArray.length : 0;
  const highestPeriod = chartDataArray.reduce((max: any, d: any) => d.total > max.total ? d : max, chartDataArray[0] || { total: 0, [isDaily ? 'day' : 'month']: '' });
  const lowestPeriod = chartDataArray.reduce((min: any, d: any) => d.total < min.total ? d : min, chartDataArray[0] || { total: Infinity, [isDaily ? 'day' : 'month']: '' });

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <div className="font-semibold mb-2">{isDaily ? data.day : data.month}</div>
          <div className="font-medium">{formatCurrency(data.total)}</div>
        </div>
      );
    }
    return null;
  };

  const xAxisKey = isDaily ? 'day' : 'month';
  const periodLabel = isDaily ? 'Day' : 'Month';

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">Total Spent</div>
          <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">Highest {periodLabel}</div>
          <div className="text-2xl font-bold">{formatCurrency(highestPeriod?.total || 0)}</div>
          <div className="text-xs text-muted-foreground">{highestPeriod?.[xAxisKey]}</div>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">Lowest {periodLabel}</div>
          <div className="text-2xl font-bold">{formatCurrency(lowestPeriod?.total || 0)}</div>
          <div className="text-xs text-muted-foreground">{lowestPeriod?.[xAxisKey]}</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartDataArray}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={xAxisKey}
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

