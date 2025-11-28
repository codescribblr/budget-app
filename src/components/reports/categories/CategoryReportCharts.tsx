'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Category, TransactionWithSplits } from '@/lib/types';
import CategorySpendingTrend from '../trends/CategorySpendingTrends';
import MonthlySpendingTrend from '../trends/MonthlySpendingTrend';

interface CategoryReportChartsProps {
  category: Category;
  transactions: TransactionWithSplits[];
  startDate?: string;
  endDate?: string;
}

export default function CategoryReportCharts({
  category,
  transactions,
  startDate = '',
  endDate = '',
}: CategoryReportChartsProps) {
  // Filter transactions to only include this category
  const categoryTransactions = useMemo(() => {
    return transactions.filter(t =>
      t.splits.some(split => split.category_id === category.id)
    );
  }, [transactions, category.id]);

  if (categoryTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Charts & Trends</CardTitle>
          <CardDescription>No transaction data available for the selected period</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Monthly Spending Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spending Trend</CardTitle>
          <CardDescription>Spending over time for this category</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlySpendingTrend
            transactions={categoryTransactions}
            categories={[category]}
          />
        </CardContent>
      </Card>

      {/* Category Spending Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Spending Patterns</CardTitle>
          <CardDescription>Detailed spending analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <CategorySpendingTrend
            transactions={categoryTransactions}
            categories={[category]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

