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
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF6B9D', '#C084FC', '#FB923C',
];

export default function CategoryMerchantBreakdown({ transactions, category }: CategoryMerchantBreakdownProps) {
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
        // Extract month key directly from date string (YYYY-MM-DD format)
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

    return data;
  }, [transactions, category.id, selectedMerchants]);

  const toggleMerchant = (merchantName: string) => {
    setSelectedMerchants(prev =>
      prev.includes(merchantName)
        ? prev.filter(name => name !== merchantName)
        : [...prev, merchantName]
    );
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

