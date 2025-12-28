'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Category } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface MerchantSpendingTrendsProps {
  transactions: TransactionWithSplits[];
  categories: Category[];
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF6B9D', '#C084FC', '#FB923C',
];

export default function MerchantSpendingTrends({ transactions, categories }: MerchantSpendingTrendsProps) {
  // Find top 5 merchants by total spending (excluding system categories)
  const topMerchants = useMemo(() => {
    const merchantTotals = new Map<string, number>();

    transactions.forEach(transaction => {
      const merchantName = transaction.merchant_name || 'Unknown';

      // Sum only splits that are NOT in system categories
      const nonSystemTotal = transaction.splits.reduce((sum, split) => {
        const category = categories.find(c => c.id === split.category_id);
        if (category && !category.is_system) {
          const signedAmount = transaction.transaction_type === 'income' ? -split.amount : split.amount;
          return sum + signedAmount;
        }
        return sum;
      }, 0);

      if (nonSystemTotal > 0) {
        const current = merchantTotals.get(merchantName) || 0;
        merchantTotals.set(merchantName, current + nonSystemTotal);
      }
    });

    return Array.from(merchantTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }, [transactions, categories]);

  const [selectedMerchants, setSelectedMerchants] = useState<string[]>(topMerchants);

  const chartData = useMemo(() => {
    // Group by month and merchant
    const monthlyData = new Map<string, Map<string, number>>();

    transactions.forEach(transaction => {
      const merchantName = transaction.merchant_name || 'Unknown';

      if (!selectedMerchants.includes(merchantName)) return;

      // Sum only splits that are NOT in system categories
      const nonSystemTotal = transaction.splits.reduce((sum, split) => {
        const category = categories.find(c => c.id === split.category_id);
        if (category && !category.is_system) {
          const signedAmount = transaction.transaction_type === 'income' ? -split.amount : split.amount;
          return sum + signedAmount;
        }
        return sum;
      }, 0);

      if (nonSystemTotal > 0) {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, new Map());
        }

        const monthMerchants = monthlyData.get(monthKey)!;
        const current = monthMerchants.get(merchantName) || 0;
        monthMerchants.set(merchantName, current + nonSystemTotal);
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
  }, [transactions, selectedMerchants]);

  const toggleMerchant = (merchantName: string) => {
    setSelectedMerchants(prev =>
      prev.includes(merchantName)
        ? prev.filter(name => name !== merchantName)
        : [...prev, merchantName]
    );
  };

  if (topMerchants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Merchant Spending Trends</CardTitle>
          <CardDescription>
            Track spending at your top merchants over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No merchant data available. Merchants are automatically grouped from transaction descriptions.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Merchant Spending Trends</CardTitle>
        <CardDescription>
          Track spending at your top merchants over time
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              content={({ active, payload, label }) => {
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
              }}
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
      </CardContent>
    </Card>
  );
}

