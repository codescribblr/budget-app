'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Category } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface CategorySpendingTrendsProps {
  transactions: TransactionWithSplits[];
  categories: Category[];
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF6B9D', '#C084FC', '#FB923C',
];

export default function CategorySpendingTrends({ transactions, categories }: CategorySpendingTrendsProps) {
  // Find top 5 categories by total spending
  const topCategories = useMemo(() => {
    const categoryTotals = new Map<number, number>();

    transactions.forEach(transaction => {
      transaction.splits.forEach(split => {
        const category = categories.find(c => c.id === split.category_id);
        if (category && !category.is_system) {
          const current = categoryTotals.get(split.category_id) || 0;
          categoryTotals.set(split.category_id, current + split.amount);
        }
      });
    });

    return Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => categories.find(c => c.id === id)!)
      .filter(Boolean);
  }, [transactions, categories]);

  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    topCategories.map(c => c.id)
  );

  const chartData = useMemo(() => {
    // Group by month and category
    const monthlyData = new Map<string, Map<number, number>>();

    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, new Map());
      }

      const monthCategories = monthlyData.get(monthKey)!;

      transaction.splits.forEach(split => {
        if (selectedCategories.includes(split.category_id)) {
          const current = monthCategories.get(split.category_id) || 0;
          monthCategories.set(split.category_id, current + split.amount);
        }
      });
    });

    // Convert to array format for recharts
    const data = Array.from(monthlyData.entries())
      .map(([month, categoryMap]) => {
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        const dataPoint: any = {
          month: monthName,
          monthKey: month,
        };

        selectedCategories.forEach(catId => {
          const category = categories.find(c => c.id === catId);
          if (category) {
            dataPoint[category.name] = categoryMap.get(catId) || 0;
          }
        });

        return dataPoint;
      })
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    return data;
  }, [transactions, categories, selectedCategories]);

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Spending Trends</CardTitle>
        <CardDescription>
          Compare spending across categories over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-4">
          {topCategories.map((category, index) => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={`cat-${category.id}`}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => toggleCategory(category.id)}
              />
              <Label
                htmlFor={`cat-${category.id}`}
                className="cursor-pointer flex items-center gap-2"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                {category.name}
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
            {topCategories.map((category, index) => (
              selectedCategories.includes(category.id) && (
                <Line
                  key={category.id}
                  type="monotone"
                  dataKey={category.name}
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

