'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Category } from '@/lib/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SpendingPieChartProps {
  transactions: TransactionWithSplits[];
  categories: Category[];
  onCategoryClick?: (categoryId: number) => void;
}

// Color palette for the pie chart
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF6B9D', '#C084FC', '#FB923C',
  '#34D399', '#60A5FA', '#F472B6', '#A78BFA', '#FBBF24',
];

export default function SpendingPieChart({ transactions, categories, onCategoryClick }: SpendingPieChartProps) {
  // Calculate spending by category
  const categorySpending = new Map<number, number>();
  
  transactions.forEach(transaction => {
    transaction.splits.forEach(split => {
      const current = categorySpending.get(split.category_id) || 0;
      categorySpending.set(split.category_id, current + split.amount);
    });
  });

  // Create array of categories with spending (exclude system categories like Transfer)
  const categoriesWithSpending = categories
    .filter(cat => !cat.is_system)
    .map(category => ({
      ...category,
      spent: categorySpending.get(category.id) || 0,
    }))
    .filter(cat => cat.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  const totalSpent = categoriesWithSpending.reduce((sum, cat) => sum + cat.spent, 0);

  // Prepare data for pie chart
  const chartData = categoriesWithSpending.map((category, index) => ({
    name: category.name,
    value: category.spent,
    categoryId: category.id,
    color: COLORS[index % COLORS.length],
  }));

  if (categoriesWithSpending.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending Distribution</CardTitle>
          <CardDescription>No transactions in selected period</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = (data.value / totalSpent) * 100;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm">{formatCurrency(data.value)}</p>
          <p className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const handlePieClick = (data: any) => {
    if (onCategoryClick && data.categoryId) {
      onCategoryClick(data.categoryId);
    }
  };

  const renderLabel = (entry: any) => {
    const percent = entry.percent as number;
    return `${entry.name}: ${(percent * 100).toFixed(0)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending Distribution</CardTitle>
        <CardDescription>
          Total spent: {formatCurrency(totalSpent)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
              onClick={handlePieClick}
              style={{ cursor: onCategoryClick ? 'pointer' : 'default' }}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => {
                const percentage = (entry.payload.value / totalSpent) * 100;
                return `${value} (${percentage.toFixed(1)}%)`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

