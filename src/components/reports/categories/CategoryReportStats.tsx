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
  lastTransactionDate?: string | null;
  monthTransactionCount?: number | null;
  /** When true, show calendar MTD/YTD budget summary instead of period transaction stats */
  budgetSummaryOnly?: boolean;
  monthlySpending?: number;
  ytdSpending?: number;
}

export default function CategoryReportStats({
  category,
  transactions,
  startDate = '',
  endDate = '',
  lastTransactionDate = null,
  monthTransactionCount = null,
  budgetSummaryOnly = false,
  monthlySpending = 0,
  ytdSpending = 0,
}: CategoryReportStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const ytdStartDate = `${currentYear}-01-01`;
    const currentMonth = now.getMonth() + 1; // 1-12

    // Determine the date range for calculations
    // If startDate/endDate are provided, use them; otherwise use YTD
    const effectiveStartDate = startDate || ytdStartDate;
    const effectiveEndDate = endDate || now.toISOString().split('T')[0];
    
    // Calculate the number of months in the period
    // Parse dates manually to avoid timezone issues with Date constructor
    const calculateMonthsInPeriod = (start: string, end: string): number => {
      const [startYear, startMonth, startDay] = start.split('-').map(Number);
      const [endYear, endMonth, endDay] = end.split('-').map(Number);
      
      // Calculate months difference
      let monthsDiff = (endYear - startYear) * 12 + (endMonth - startMonth);
      
      // If same month, it's 1 month regardless of days
      if (monthsDiff === 0) {
        return 1;
      }
      
      // For different months, we need to check if we should count the partial months
      // If start is at the beginning of a month and end is at the end of a month,
      // we count both months fully. Otherwise, we count the difference.
      // For simplicity, if monthsDiff > 0, we add 1 to include both endpoints
      return monthsDiff + 1;
    };
    
    const monthsInPeriod = calculateMonthsInPeriod(effectiveStartDate, effectiveEndDate);

    // Calculate spending (expenses add, income subtracts) for the period
    let totalSpent = 0;
    let totalIncome = 0;
    let transactionCount = 0;
    let largestExpense = 0;
    let largestIncome = 0;
    let averageAmount = 0;

    transactions.forEach(transaction => {
      // Get all splits for this category (a transaction might have multiple splits for the same category)
      const categorySplits = transaction.splits.filter(s => s.category_id === category.id);
      if (categorySplits.length > 0) {
        // Count the transaction once (even if it has multiple splits for this category)
        transactionCount++;
        
        // Sum all splits for this category in this transaction
        const totalAmount = categorySplits.reduce((sum, split) => sum + Number(split.amount), 0);

        if (transaction.transaction_type === 'expense') {
          totalSpent += totalAmount;
          // Track largest single split amount for this category
          const maxSplitAmount = Math.max(...categorySplits.map(s => Number(s.amount)));
          if (maxSplitAmount > largestExpense) {
            largestExpense = maxSplitAmount;
          }
        } else {
          totalIncome += totalAmount;
          // Track largest single split amount for this category
          const maxSplitAmount = Math.max(...categorySplits.map(s => Number(s.amount)));
          if (maxSplitAmount > largestIncome) {
            largestIncome = maxSplitAmount;
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

    // Calculate budget and variance for monthly_expense
    let monthlyBudget: number | undefined;
    let ytdBudget: number | undefined;
    let variance: number | undefined;
    let budgetProgress: number | undefined;

    if (category.category_type === 'monthly_expense') {
      monthlyBudget = category.monthly_target || category.monthly_amount || 0;
      
      // Calculate YTD budget (or period budget if custom dates)
      if (!startDate || !endDate) {
        // YTD: multiply monthly budget by number of months elapsed
        ytdBudget = monthlyBudget * currentMonth;
        variance = ytdBudget - netSpending;
        budgetProgress = ytdBudget > 0 ? (netSpending / ytdBudget) * 100 : 0;
      } else {
        // Custom period: multiply monthly budget by number of months in period
        ytdBudget = monthlyBudget * monthsInPeriod;
        variance = ytdBudget - netSpending;
        budgetProgress = ytdBudget > 0 ? (netSpending / ytdBudget) * 100 : 0;
      }
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

    let periodLabel = 'Selected period';
    if (!startDate && !endDate) {
      periodLabel = 'Year to date';
    } else if (startDate && endDate) {
      const [sy, sm, sd] = startDate.split('-').map(Number);
      const [ey, em, ed] = endDate.split('-').map(Number);
      const now = new Date();
      const isCurrentMonth =
        sy === now.getFullYear() &&
        sm === now.getMonth() + 1 &&
        sd === 1 &&
        ey === now.getFullYear() &&
        em === now.getMonth() + 1;
      if (isCurrentMonth) {
        periodLabel = 'This month';
      } else if (monthsInPeriod === 1) {
        periodLabel = 'This period';
      } else {
        periodLabel = `${monthsInPeriod}-month period`;
      }
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
      ytdBudget,
      variance,
      budgetProgress,
      targetBalance,
      currentBalance,
      balanceProgress,
      monthsInPeriod,
      periodLabel,
    };
  }, [category, transactions, startDate, endDate]);

  const currentBalanceCard = (
    <Card>
      <CardHeader className="pb-0 md:pb-2">
        <CardDescription className="text-xs md:text-sm">Current balance</CardDescription>
        <CardTitle className={`text-sm md:text-lg lg:text-xl xl:text-2xl ${(category.current_balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(category.current_balance || 0)}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-1 md:pb-4">
        <p className="text-xs text-muted-foreground">Available in this category</p>
      </CardContent>
    </Card>
  );

  const budgetStatusCard = (() => {
    const type = category.category_type || 'monthly_expense';

    if (type === 'monthly_expense' && stats.monthlyBudget !== undefined && stats.ytdBudget !== undefined) {
      const remaining = stats.variance ?? 0;
      const isUnderBudget = remaining >= 0;

      return (
        <Card>
          <CardHeader className="pb-0 md:pb-2">
            <CardDescription className="text-xs md:text-sm">Budget · {stats.periodLabel}</CardDescription>
            <CardTitle className="text-sm md:text-lg lg:text-xl xl:text-2xl">
              <span className={stats.netSpending > stats.ytdBudget ? 'text-red-600' : undefined}>
                {formatCurrency(stats.netSpending)}
              </span>
              <span className="text-muted-foreground font-normal text-base md:text-lg lg:text-xl">
                {' '}of {formatCurrency(stats.ytdBudget)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-1 md:pb-4">
            <p className={`text-sm font-medium ${isUnderBudget ? 'text-green-600' : 'text-red-600'}`}>
              {isUnderBudget
                ? `${formatCurrency(remaining)} remaining`
                : `${formatCurrency(Math.abs(remaining))} over budget`}
            </p>
            {stats.monthsInPeriod > 1 ? (
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(stats.monthlyBudget)}/mo · {stats.monthsInPeriod} months budgeted
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Monthly budget {formatCurrency(stats.monthlyBudget)}
              </p>
            )}
          </CardContent>
        </Card>
      );
    }

    if (type === 'accumulation' && stats.annualTarget) {
      const saved = stats.ytdSpent ?? 0;
      const remaining = stats.annualTarget - saved;

      return (
        <Card>
          <CardHeader className="pb-0 md:pb-2">
            <CardDescription className="text-xs md:text-sm">Annual savings goal</CardDescription>
            <CardTitle className="text-sm md:text-lg lg:text-xl xl:text-2xl">
              {formatCurrency(saved)}
              <span className="text-muted-foreground font-normal text-base md:text-lg lg:text-xl">
                {' '}of {formatCurrency(stats.annualTarget)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-1 md:pb-4">
            <p className="text-sm font-medium">
              {remaining >= 0
                ? `${formatCurrency(remaining)} left to save this year`
                : `${formatCurrency(Math.abs(remaining))} above annual goal`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.ytdProgress?.toFixed(0)}% of annual target
            </p>
          </CardContent>
        </Card>
      );
    }

    if (type === 'target_balance' && stats.targetBalance !== undefined) {
      const current = stats.currentBalance ?? category.current_balance ?? 0;
      const remaining = stats.targetBalance - current;

      return (
        <Card>
          <CardHeader className="pb-0 md:pb-2">
            <CardDescription className="text-xs md:text-sm">Target balance</CardDescription>
            <CardTitle className="text-sm md:text-lg lg:text-xl xl:text-2xl">
              {formatCurrency(current)}
              <span className="text-muted-foreground font-normal text-base md:text-lg lg:text-xl">
                {' '}of {formatCurrency(stats.targetBalance)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-1 md:pb-4">
            <p className="text-sm font-medium">
              {remaining > 0
                ? `${formatCurrency(remaining)} to reach target`
                : remaining < 0
                  ? `${formatCurrency(Math.abs(remaining))} above target`
                  : 'Target reached'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.balanceProgress?.toFixed(0)}% funded
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader className="pb-0 md:pb-2">
          <CardDescription className="text-xs md:text-sm">Monthly funding</CardDescription>
          <CardTitle className="text-sm md:text-lg lg:text-xl xl:text-2xl">
            {formatCurrency(category.monthly_amount ?? 0)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-1 md:pb-4">
          <p className="text-xs text-muted-foreground">Allocated per month</p>
        </CardContent>
      </Card>
    );
  })();

  const freeBudgetStatusCard = (() => {
    const type = category.category_type || 'monthly_expense';

    if (type === 'accumulation') {
      const annualTarget = category.annual_target || (category.monthly_amount * 12);
      const remaining = annualTarget - ytdSpending;
      return (
        <Card>
          <CardHeader className="pb-0 md:pb-2">
            <CardDescription className="text-xs md:text-sm">Annual savings goal</CardDescription>
            <CardTitle className="text-sm md:text-lg lg:text-xl xl:text-2xl">
              {formatCurrency(ytdSpending)}
              <span className="text-muted-foreground font-normal text-base md:text-lg lg:text-xl">
                {' '}of {formatCurrency(annualTarget)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-1 md:pb-4">
            <p className="text-sm font-medium">
              {remaining >= 0
                ? `${formatCurrency(remaining)} left to save this year`
                : `${formatCurrency(Math.abs(remaining))} above annual goal`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(monthlySpending)} saved this month
            </p>
          </CardContent>
        </Card>
      );
    }

    if (type === 'target_balance') {
      const target = category.target_balance || 0;
      const current = category.current_balance || 0;
      const remaining = target - current;
      return (
        <Card>
          <CardHeader className="pb-0 md:pb-2">
            <CardDescription className="text-xs md:text-sm">Target balance</CardDescription>
            <CardTitle className="text-sm md:text-lg lg:text-xl xl:text-2xl">
              {formatCurrency(current)}
              <span className="text-muted-foreground font-normal text-base md:text-lg lg:text-xl">
                {' '}of {formatCurrency(target)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-1 md:pb-4">
            <p className="text-sm font-medium">
              {remaining > 0
                ? `${formatCurrency(remaining)} to reach target`
                : remaining < 0
                  ? `${formatCurrency(Math.abs(remaining))} above target`
                  : 'Target reached'}
            </p>
          </CardContent>
        </Card>
      );
    }

    const monthlyBudget = category.monthly_target || category.monthly_amount || 0;
    const remaining = monthlyBudget - monthlySpending;
    const isUnderBudget = remaining >= 0;

    return (
      <Card>
        <CardHeader className="pb-0 md:pb-2">
          <CardDescription className="text-xs md:text-sm">Budget · This month</CardDescription>
          <CardTitle className="text-sm md:text-lg lg:text-xl xl:text-2xl">
            <span className={monthlySpending > monthlyBudget ? 'text-red-600' : undefined}>
              {formatCurrency(monthlySpending)}
            </span>
            <span className="text-muted-foreground font-normal text-base md:text-lg lg:text-xl">
              {' '}of {formatCurrency(monthlyBudget)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-1 md:pb-4">
          <p className={`text-sm font-medium ${isUnderBudget ? 'text-green-600' : 'text-red-600'}`}>
            {isUnderBudget
              ? `${formatCurrency(remaining)} remaining`
              : `${formatCurrency(Math.abs(remaining))} over budget`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatCurrency(ytdSpending)} spent year to date
          </p>
        </CardContent>
      </Card>
    );
  })();

  if (budgetSummaryOnly) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 md:gap-3 lg:gap-4">
        {freeBudgetStatusCard}
        {currentBalanceCard}

        <Card>
          <CardHeader className="pb-0 md:pb-2">
            <CardDescription className="text-xs md:text-sm">Activity</CardDescription>
            <CardTitle className="text-sm md:text-lg lg:text-xl xl:text-2xl">
              {monthTransactionCount ?? '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-1 md:pb-4">
            <div className="text-xs text-muted-foreground space-y-0 md:space-y-1">
              <div>Transactions this month</div>
              {lastTransactionDate && <div>Last: {lastTransactionDate}</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 md:gap-3 lg:gap-4">
      {budgetStatusCard}
      {currentBalanceCard}

      {/* Total Transactions */}
      <Card>
        <CardHeader className="pb-0 md:pb-2">
          <CardDescription className="text-xs md:text-sm">Transactions</CardDescription>
          <CardTitle className="text-sm md:text-lg lg:text-xl xl:text-2xl">{stats.transactionCount}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-1 md:pb-4">
          <div className="text-xs text-muted-foreground space-y-0 md:space-y-1">
            <p>{stats.transactionCount === 1 ? 'transaction' : 'transactions'} in period</p>
            {lastTransactionDate && <p>Last: {lastTransactionDate}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Net Spending */}
      <Card>
        <CardHeader className="pb-0 md:pb-2">
          <CardDescription className="text-xs md:text-sm">Net Spending</CardDescription>
          <CardTitle className={`text-sm md:text-lg lg:text-xl xl:text-2xl ${stats.netSpending >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(stats.netSpending)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-1 md:pb-4">
          <div className="text-xs text-muted-foreground space-y-0 md:space-y-1">
            <div>Spent: {formatCurrency(stats.totalSpent)}</div>
            {stats.totalIncome > 0 && (
              <div>Income: {formatCurrency(stats.totalIncome)}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Average Amount */}
      <Card>
        <CardHeader className="pb-0 md:pb-2">
          <CardDescription className="text-xs md:text-sm">Average</CardDescription>
          <CardTitle className="text-sm md:text-lg lg:text-xl xl:text-2xl">
            {formatCurrency(stats.averageAmount)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-1 md:pb-4">
          <div className="text-xs text-muted-foreground space-y-0 md:space-y-1">
            {stats.largestExpense > 0 && (
              <div>Largest: {formatCurrency(stats.largestExpense)}</div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}


