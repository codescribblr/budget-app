'use client';

import { useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Category } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface CategoryMerchantBreakdownProps {
  transactions: TransactionWithSplits[];
  category: Category;
  startDate?: string;
  endDate?: string;
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF6B9D', '#C084FC', '#FB923C',
];

export default function CategoryMerchantBreakdown({ transactions, category, startDate = '', endDate = '' }: CategoryMerchantBreakdownProps) {
  // Find top merchants for this specific category
  const topMerchants = useMemo(() => {
    const merchantTotals = new Map<string, number>();

    transactions.forEach(transaction => {
      // Only include transactions that have a split in this category
      const categorySplit = transaction.splits.find(s => s.category_id === category.id);
      if (!categorySplit) return;

      const merchantName = transaction.merchant_name || 'Unknown';
      const amount = transaction.transaction_type === 'expense'
        ? categorySplit.amount
        : -categorySplit.amount;

      if (amount > 0) {
        const current = merchantTotals.get(merchantName) || 0;
        merchantTotals.set(merchantName, current + amount);
      }
    });

    return Array.from(merchantTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }, [transactions, category.id]);

  const [selectedMerchants, setSelectedMerchants] = useState<string[]>(topMerchants);

  const chartData = useMemo(() => {
    // Calculate number of days in the date range
    let daysInRange = 0;
    if (startDate && endDate) {
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T00:00:00');
      // Calculate difference in milliseconds, convert to days
      const diffTime = end.getTime() - start.getTime();
      daysInRange = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    } else if (transactions.length > 0) {
      // Calculate from transaction dates if no date range provided
      const dates = transactions
        .map(t => t.date)
        .sort();
      if (dates.length > 0) {
        const firstDate = new Date(dates[0] + 'T00:00:00');
        const lastDate = new Date(dates[dates.length - 1] + 'T00:00:00');
        const diffTime = lastDate.getTime() - firstDate.getTime();
        daysInRange = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
    }

    // If less than 60 days (roughly 2 months), show daily data instead
    const useDailyView = daysInRange < 60;

    if (useDailyView) {
      // Group by day and merchant
      const dailyData = new Map<string, Map<string, number>>();

      transactions.forEach(transaction => {
        const categorySplit = transaction.splits.find(s => s.category_id === category.id);
        if (!categorySplit) return;

        const merchantName = transaction.merchant_name || 'Unknown';
        if (!selectedMerchants.includes(merchantName)) return;

        const amount = transaction.transaction_type === 'expense'
          ? categorySplit.amount
          : -categorySplit.amount;

        if (amount > 0) {
          const dayKey = transaction.date; // Use full date (YYYY-MM-DD)

          if (!dailyData.has(dayKey)) {
            dailyData.set(dayKey, new Map());
          }

          const dayMerchants = dailyData.get(dayKey)!;
          const current = dayMerchants.get(merchantName) || 0;
          dayMerchants.set(merchantName, current + amount);
        }
      });

      // Convert to array format for recharts
      const data = Array.from(dailyData.entries())
        .map(([day, merchantMap]) => {
          const date = new Date(day);
          const dayName = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          const dataPoint: any = {
            day: dayName,
            dayKey: day,
          };

          selectedMerchants.forEach(merchantName => {
            dataPoint[merchantName] = merchantMap.get(merchantName) || 0;
          });

          return dataPoint;
        })
        .sort((a, b) => a.dayKey.localeCompare(b.dayKey));

      return { data, isDaily: true };
    } else {
      // Group by month and merchant
      const monthlyData = new Map<string, Map<string, number>>();

      transactions.forEach(transaction => {
        const categorySplit = transaction.splits.find(s => s.category_id === category.id);
        if (!categorySplit) return;

        const merchantName = transaction.merchant_name || 'Unknown';
        if (!selectedMerchants.includes(merchantName)) return;

        const amount = transaction.transaction_type === 'expense'
          ? categorySplit.amount
          : -categorySplit.amount;

        if (amount > 0) {
          const monthKey = transaction.date.substring(0, 7); // Gets "YYYY-MM"

          if (!monthlyData.has(monthKey)) {
            monthlyData.set(monthKey, new Map());
          }

          const monthMerchants = monthlyData.get(monthKey)!;
          const current = monthMerchants.get(merchantName) || 0;
          monthMerchants.set(merchantName, current + amount);
        }
      });

      // Convert to array format for recharts
      const data = Array.from(monthlyData.entries())
        .map(([month, merchantMap]) => {
          const [year, monthNum] = month.split('-');
          const date = new Date(parseInt(year), parseInt(monthNum) - 1);
          const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

          const dataPoint: any = {
            month: monthName,
            monthKey: month,
          };

          selectedMerchants.forEach(merchantName => {
            dataPoint[merchantName] = merchantMap.get(merchantName) || 0;
          });

          return dataPoint;
        })
        .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

      return { data, isDaily: false };
    }
  }, [transactions, category.id, selectedMerchants, startDate, endDate]);

  const toggleMerchant = (merchantName: string) => {
    setSelectedMerchants(prev =>
      prev.includes(merchantName)
        ? prev.filter(name => name !== merchantName)
        : [...prev, merchantName]
    );
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <div className="font-semibold mb-2 text-foreground">{label}</div>
          <div className="text-sm space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="text-foreground">
                <span
                  className="inline-block w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}: {formatCurrency(entry.value)}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (topMerchants.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No merchant data available for this category. Merchants are automatically grouped from transaction descriptions.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4">
        {topMerchants.map((merchantName, index) => (
          <div key={merchantName} className="flex items-center space-x-2">
            <Checkbox
              id={`merchant-${index}`}
              checked={selectedMerchants.includes(merchantName)}
              onCheckedChange={() => toggleMerchant(merchantName)}
            />
            <Label
              htmlFor={`merchant-${index}`}
              className="cursor-pointer flex items-center gap-2"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              {merchantName}
            </Label>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={chartData.isDaily ? 'day' : 'month'}
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
          {topMerchants.map((merchantName, index) => (
            selectedMerchants.includes(merchantName) && (
              <Line
                key={merchantName}
                type="monotone"
                dataKey={merchantName}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            )
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

