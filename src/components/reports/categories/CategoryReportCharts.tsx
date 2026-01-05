'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Category, TransactionWithSplits } from '@/lib/types';
import CategoryMonthlyTrend from './CategoryMonthlyTrend';
import CategoryMerchantBreakdown from './CategoryMerchantBreakdown';
import CategoryDayOfWeekSpending from './CategoryDayOfWeekSpending';
import CategoryTransactionSizeDistribution from './CategoryTransactionSizeDistribution';
import CategoryWeekOfMonthSpending from './CategoryWeekOfMonthSpending';
import CategoryRecurringTransactions from './CategoryRecurringTransactions';

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
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Monthly Spending Trend */}
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="text-base md:text-lg">Monthly Spending Trend</CardTitle>
            <CardDescription className="text-xs md:text-sm">Spending over time for this category</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryMonthlyTrend
              transactions={categoryTransactions}
              category={category}
              startDate={startDate}
              endDate={endDate}
            />
          </CardContent>
        </Card>

        {/* Merchant Breakdown */}
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="text-base md:text-lg">Top Merchants</CardTitle>
            <CardDescription className="text-xs md:text-sm">Spending by merchant over time for this category</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryMerchantBreakdown
              transactions={categoryTransactions}
              category={category}
              startDate={startDate}
              endDate={endDate}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Day of Week Spending Pattern */}
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="text-base md:text-lg">Spending by Day of Week</CardTitle>
            <CardDescription className="text-xs md:text-sm">Which days of the week you spend the most in this category</CardDescription>
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
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="text-base md:text-lg">Transaction Size Distribution</CardTitle>
            <CardDescription className="text-xs md:text-sm">Distribution of transaction amounts in this category</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryTransactionSizeDistribution
              transactions={categoryTransactions}
              category={category}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Week of Month Spending Pattern */}
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="text-base md:text-lg">Spending by Week of Month</CardTitle>
            <CardDescription className="text-xs md:text-sm">Which week of the month you spend the most in this category</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryWeekOfMonthSpending
              transactions={categoryTransactions}
              category={category}
            />
          </CardContent>
        </Card>

        {/* Recurring Transactions */}
        <CategoryRecurringTransactions />
      </div>
    </div>
  );
}


