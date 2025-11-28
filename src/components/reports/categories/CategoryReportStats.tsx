'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { Category, TransactionWithSplits } from '@/lib/types';

interface CategoryReportStatsProps {
  category: Category;
  transactions: TransactionWithSplits[];
  startDate?: string;
  endDate?: string;
}

export default function CategoryReportStats({
  category,
  transactions,
  startDate = '',
  endDate = '',
}: CategoryReportStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const ytdStartDate = `${currentYear}-01-01`;

    // Calculate spending (expenses add, income subtracts)
    let totalSpent = 0;
    let totalIncome = 0;
    let transactionCount = 0;
    let largestExpense = 0;
    let largestIncome = 0;
    let averageAmount = 0;

    transactions.forEach(transaction => {
      const split = transaction.splits.find(s => s.category_id === category.id);
      if (split) {
        transactionCount++;
        const amount = split.amount;

        if (transaction.transaction_type === 'expense') {
          totalSpent += amount;
          if (amount > largestExpense) {
            largestExpense = amount;
          }
        } else {
          totalIncome += amount;
          if (amount > largestIncome) {
            largestIncome = amount;
          }
        }
      }
    });

    const netSpending = totalSpent - totalIncome;
    averageAmount = transactionCount > 0 ? netSpending / transactionCount : 0;

    // Calculate YTD spent for accumulation categories
    let ytdSpent: number | undefined;
    let annualTarget: number | undefined;
    let monthlyTarget: number | undefined;
    let ytdTarget: number | undefined;
    let ytdProgress: number | undefined;

    if (category.category_type === 'accumulation') {
      annualTarget = category.annual_target || (category.monthly_amount * 12);
      monthlyTarget = annualTarget / 12;

      // Calculate YTD target based on current month
      const currentMonth = now.getMonth() + 1; // 1-12
      ytdTarget = monthlyTarget * currentMonth;

      // Calculate YTD spent
      const ytdTransactions = transactions.filter(t => {
        const transactionDate = t.date;
        return transactionDate >= ytdStartDate;
      });

      ytdSpent = 0;
      ytdTransactions.forEach(transaction => {
        const split = transaction.splits.find(s => s.category_id === category.id);
        if (split) {
          const amount = transaction.transaction_type === 'expense'
            ? split.amount
            : -split.amount;
          ytdSpent! += amount;
        }
      });

      ytdProgress = annualTarget > 0 ? (ytdSpent / annualTarget) * 100 : 0;
    }

    // Calculate monthly budget and variance for monthly_expense
    let monthlyBudget: number | undefined;
    let variance: number | undefined;
    let budgetProgress: number | undefined;

    if (category.category_type === 'monthly_expense') {
      monthlyBudget = category.monthly_target || category.monthly_amount || 0;
      variance = monthlyBudget - netSpending;
      budgetProgress = monthlyBudget > 0 ? (netSpending / monthlyBudget) * 100 : 0;
    }

    // Calculate target balance progress
    let targetBalance: number | undefined;
    let currentBalance: number | undefined;
    let balanceProgress: number | undefined;

    if (category.category_type === 'target_balance') {
      targetBalance = category.target_balance || 0;
      currentBalance = category.current_balance || 0;
      balanceProgress = targetBalance > 0 ? (currentBalance / targetBalance) * 100 : 0;
    }

    return {
      totalSpent,
      totalIncome,
      netSpending,
      transactionCount,
      largestExpense,
      largestIncome,
      averageAmount,
      ytdSpent,
      annualTarget,
      monthlyTarget,
      ytdTarget,
      ytdProgress,
      monthlyBudget,
      variance,
      budgetProgress,
      targetBalance,
      currentBalance,
      balanceProgress,
    };
  }, [category, transactions]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
      {/* Total Transactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="text-xs md:text-sm">Transactions</CardDescription>
          <CardTitle className="text-base md:text-xl lg:text-2xl">{stats.transactionCount}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            {stats.transactionCount === 1 ? 'transaction' : 'transactions'} in period
          </p>
        </CardContent>
      </Card>

      {/* Net Spending */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="text-xs md:text-sm">Net Spending</CardDescription>
          <CardTitle className={`text-base md:text-xl lg:text-2xl ${stats.netSpending >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(stats.netSpending)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs text-muted-foreground space-y-0.5 md:space-y-1">
            <div>Spent: {formatCurrency(stats.totalSpent)}</div>
            {stats.totalIncome > 0 && (
              <div>Income: {formatCurrency(stats.totalIncome)}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Average Amount */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="text-xs md:text-sm">Average</CardDescription>
          <CardTitle className="text-base md:text-xl lg:text-2xl">
            {formatCurrency(stats.averageAmount)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs text-muted-foreground space-y-0.5 md:space-y-1">
            {stats.largestExpense > 0 && (
              <div>Largest: {formatCurrency(stats.largestExpense)}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category Type Specific Stats */}
      {category.category_type === 'accumulation' && stats.annualTarget && (
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs md:text-sm">Annual Progress</CardDescription>
            <CardTitle className="text-base md:text-xl lg:text-2xl">
              {stats.ytdProgress?.toFixed(0)}%
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xs text-muted-foreground space-y-0.5 md:space-y-1">
              <div>YTD: {formatCurrency(stats.ytdSpent || 0)}</div>
              <div>Target: {formatCurrency(stats.annualTarget)}</div>
              {stats.ytdTarget && (
                <div className="hidden sm:block">YTD Target: {formatCurrency(stats.ytdTarget)}</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {category.category_type === 'monthly_expense' && stats.monthlyBudget !== undefined && (
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs md:text-sm">Budget Status</CardDescription>
            <CardTitle className={`text-base md:text-xl lg:text-2xl ${stats.variance! >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.budgetProgress?.toFixed(0)}%
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xs text-muted-foreground space-y-0.5 md:space-y-1">
              <div>Budget: {formatCurrency(stats.monthlyBudget)}</div>
              <div>Variance: {formatCurrency(stats.variance!)}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {category.category_type === 'target_balance' && stats.targetBalance !== undefined && (
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs md:text-sm">Target Progress</CardDescription>
            <CardTitle className="text-base md:text-xl lg:text-2xl">
              {stats.balanceProgress?.toFixed(0)}%
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xs text-muted-foreground space-y-0.5 md:space-y-1">
              <div>Current: {formatCurrency(stats.currentBalance || 0)}</div>
              <div>Target: {formatCurrency(stats.targetBalance)}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Balance (always show) */}
      {category.category_type !== 'target_balance' && (
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs md:text-sm">Current Balance</CardDescription>
            <CardTitle className={`text-base md:text-xl lg:text-2xl ${(category.current_balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(category.current_balance || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Available balance
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

