'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Category } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

interface BudgetVsActualTrendProps {
  transactions: TransactionWithSplits[];
  categories: Category[];
}

export default function BudgetVsActualTrend({ transactions, categories }: BudgetVsActualTrendProps) {
  const chartData = useMemo(() => {
    // Calculate total monthly budget (excluding system categories)
    const totalMonthlyBudget = categories
      .filter(c => !c.is_system)
      .reduce((sum, c) => sum + c.monthly_amount, 0);

    // Group transactions by month
    const monthlyData = new Map<string, number>();

    transactions.forEach(transaction => {
      // Skip system categories
      const hasSystemCategory = transaction.splits.some(split => {
        const category = categories.find(c => c.id === split.category_id);
        return category?.is_system;
      });

      if (hasSystemCategory) return;

      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const current = monthlyData.get(monthKey) || 0;
      monthlyData.set(monthKey, current + transaction.total_amount);
    });

    // Convert to array and sort by date
    const data = Array.from(monthlyData.entries())
      .map(([month, actual]) => {
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        const variance = totalMonthlyBudget - actual;
        const percentOfBudget = totalMonthlyBudget > 0 ? (actual / totalMonthlyBudget) * 100 : 0;

        return {
          month: monthName,
          monthKey: month,
          budget: totalMonthlyBudget,
          actual,
          variance,
          percentOfBudget,
        };
      })
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    return data;
  }, [transactions, categories]);

  const averageVariance = chartData.length > 0
    ? chartData.reduce((sum, d) => sum + d.variance, 0) / chartData.length
    : 0;

  const monthsOverBudget = chartData.filter(d => d.actual > d.budget).length;
  const monthsUnderBudget = chartData.filter(d => d.actual <= d.budget).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget vs Actual Spending</CardTitle>
        <CardDescription>
          Compare your budgeted amounts to actual spending each month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Avg Variance</div>
            <div className={`text-2xl font-bold ${averageVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {averageVariance >= 0 ? '+' : ''}{formatCurrency(averageVariance)}
            </div>
            <div className="text-xs text-muted-foreground">
              {averageVariance >= 0 ? 'Under budget' : 'Over budget'}
            </div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Months Under Budget</div>
            <div className="text-2xl font-bold text-green-600">{monthsUnderBudget}</div>
            <div className="text-xs text-muted-foreground">
              {chartData.length > 0 ? Math.round((monthsUnderBudget / chartData.length) * 100) : 0}% of months
            </div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Months Over Budget</div>
            <div className="text-2xl font-bold text-red-600">{monthsOverBudget}</div>
            <div className="text-xs text-muted-foreground">
              {chartData.length > 0 ? Math.round((monthsOverBudget / chartData.length) * 100) : 0}% of months
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
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
            <ReferenceLine y={0} stroke="#000" />
            <Bar dataKey="budget" fill="#82ca9d" name="Budget" />
            <Bar dataKey="actual" fill="#8884d8" name="Actual Spending" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

