'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Category } from '@/lib/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SpendingPieChartProps {
  transactions: TransactionWithSplits[];
  categories: Category[];
  selectedCategoryId?: number | null;
  onCategoryClick?: (categoryId: number) => void;
}

// Color palette for the pie chart
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF6B9D', '#C084FC', '#FB923C',
  '#34D399', '#60A5FA', '#F472B6', '#A78BFA', '#FBBF24',
];

const OTHER_COLOR = '#9CA3AF'; // Gray color for "Other"

export default function SpendingPieChart({ transactions, categories, selectedCategoryId, onCategoryClick }: SpendingPieChartProps) {
  let chartData: any[] = [];
  let totalSpent = 0;
  let chartTitle = 'Spending Distribution';
  let chartDescription = '';

  if (selectedCategoryId) {
    // Show spending by merchant for the selected category
    const merchantSpending = new Map<string, number>();

    transactions.forEach(transaction => {
      transaction.splits.forEach(split => {
        if (split.category_id === selectedCategoryId) {
          const current = merchantSpending.get(transaction.description) || 0;
          merchantSpending.set(transaction.description, current + split.amount);
        }
      });
    });

    const merchantsArray = Array.from(merchantSpending.entries())
      .map(([description, amount]) => ({
        name: description,
        value: amount,
      }))
      .sort((a, b) => b.value - a.value);

    totalSpent = merchantsArray.reduce((sum, m) => sum + m.value, 0);

    // Group items under 4% into "Other"
    const threshold = totalSpent * 0.04;
    const mainItems = merchantsArray.filter(m => m.value >= threshold);
    const otherItems = merchantsArray.filter(m => m.value < threshold);

    chartData = mainItems.map((item, index) => ({
      ...item,
      color: COLORS[index % COLORS.length],
      isOther: false,
    }));

    if (otherItems.length > 0) {
      const otherTotal = otherItems.reduce((sum, m) => sum + m.value, 0);
      chartData.push({
        name: 'Other',
        value: otherTotal,
        color: OTHER_COLOR,
        isOther: true,
        otherItems: otherItems,
      });
    }

    const selectedCategory = categories.find(c => c.id === selectedCategoryId);
    chartTitle = `Spending by Merchant: ${selectedCategory?.name || 'Category'}`;
    chartDescription = `Total spent: ${formatCurrency(totalSpent)}`;
  } else {
    // Show spending by category
    const categorySpending = new Map<number, number>();

    transactions.forEach(transaction => {
      transaction.splits.forEach(split => {
        const current = categorySpending.get(split.category_id) || 0;
        categorySpending.set(split.category_id, current + split.amount);
      });
    });

    const categoriesWithSpending = categories
      .filter(cat => !cat.is_system)
      .map(category => ({
        ...category,
        spent: categorySpending.get(category.id) || 0,
      }))
      .filter(cat => cat.spent > 0)
      .sort((a, b) => b.spent - a.spent);

    totalSpent = categoriesWithSpending.reduce((sum, cat) => sum + cat.spent, 0);

    // Group categories under 4% into "Other"
    const threshold = totalSpent * 0.04;
    const mainCategories = categoriesWithSpending.filter(cat => cat.spent >= threshold);
    const otherCategories = categoriesWithSpending.filter(cat => cat.spent < threshold);

    chartData = mainCategories.map((category, index) => ({
      name: category.name,
      value: category.spent,
      categoryId: category.id,
      color: COLORS[index % COLORS.length],
      isOther: false,
    }));

    if (otherCategories.length > 0) {
      const otherTotal = otherCategories.reduce((sum, cat) => sum + cat.spent, 0);
      chartData.push({
        name: 'Other',
        value: otherTotal,
        color: OTHER_COLOR,
        isOther: true,
        otherItems: otherCategories.map(cat => ({
          name: cat.name,
          value: cat.spent,
        })),
      });
    }

    chartTitle = 'Spending Distribution';
    chartDescription = `Total spent: ${formatCurrency(totalSpent)}`;
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{chartTitle}</CardTitle>
          <CardDescription>No transactions in selected period</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = (data.value / totalSpent) * 100;

      if (data.isOther && data.otherItems) {
        // Show breakdown of "Other" items
        return (
          <div className="bg-background border rounded-lg p-3 shadow-lg max-w-xs">
            <p className="font-semibold mb-2">Other ({data.otherItems.length} items)</p>
            <p className="text-sm font-semibold mb-2">{formatCurrency(data.value)} ({percentage.toFixed(1)}%)</p>
            <div className="border-t pt-2 mt-2 space-y-1 max-h-48 overflow-y-auto">
              {data.otherItems.map((item: any, idx: number) => {
                const itemPercentage = (item.value / totalSpent) * 100;
                return (
                  <div key={idx} className="text-xs flex justify-between gap-2">
                    <span className="truncate">{item.name}</span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {formatCurrency(item.value)} ({itemPercentage.toFixed(1)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

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
    // Don't allow clicking on "Other" slice or when showing merchants
    if (data.isOther || selectedCategoryId) {
      return;
    }

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
        <CardTitle>{chartTitle}</CardTitle>
        <CardDescription>{chartDescription}</CardDescription>
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
              style={{ cursor: onCategoryClick && !selectedCategoryId ? 'pointer' : 'default' }}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  style={{
                    cursor: entry.isOther || selectedCategoryId ? 'default' : (onCategoryClick ? 'pointer' : 'default')
                  }}
                />
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

