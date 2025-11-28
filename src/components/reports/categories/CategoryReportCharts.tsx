'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Category, TransactionWithSplits } from '@/lib/types';
import CategoryMonthlyTrend from './CategoryMonthlyTrend';
import CategoryMerchantBreakdown from './CategoryMerchantBreakdown';
import CategoryDayOfWeekSpending from './CategoryDayOfWeekSpending';
import CategoryTransactionSizeDistribution from './CategoryTransactionSizeDistribution';

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
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Spending Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spending Trend</CardTitle>
            <CardDescription>Spending over time for this category</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryMonthlyTrend
              transactions={categoryTransactions}
              category={category}
            />
          </CardContent>
        </Card>

        {/* Merchant Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Top Merchants</CardTitle>
            <CardDescription>Spending by merchant over time for this category</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryMerchantBreakdown
              transactions={categoryTransactions}
              category={category}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day of Week Spending Pattern */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Day of Week</CardTitle>
            <CardDescription>Which days of the week you spend the most in this category</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryDayOfWeekSpending
              transactions={categoryTransactions}
              category={category}
            />
          </CardContent>
        </Card>

        {/* Transaction Size Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Size Distribution</CardTitle>
            <CardDescription>Distribution of transaction amounts in this category</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryTransactionSizeDistribution
              transactions={categoryTransactions}
              category={category}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

