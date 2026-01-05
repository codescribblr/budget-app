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
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      // Sum only splits that are NOT in system categories
      // Expenses add, income subtracts
      const nonSystemTotal = transaction.splits.reduce((sum, split) => {
        const category = categories.find(c => c.id === split.category_id);
        if (category && !category.is_system) {
          const amount = transaction.transaction_type === 'expense'
            ? split.amount
            : -split.amount;
          return sum + amount;
        }
        return sum;
      }, 0);

      // Add to monthly data (can be positive or negative)
      const current = monthlyData.get(monthKey) || 0;
      monthlyData.set(monthKey, current + nonSystemTotal);
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
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3">
                      <div className="font-semibold mb-2 text-foreground">{label}</div>
                      <div className="text-sm space-y-1">
                        {payload.map((entry: any, index: number) => (
                          <div key={index} className="text-foreground">
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
            <ReferenceLine y={0} stroke="#000" />
            <Bar dataKey="budget" fill="#82ca9d" name="Budget" />
            <Bar dataKey="actual" fill="#8884d8" name="Actual Spending" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}


