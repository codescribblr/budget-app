'use client';

import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { useFeature } from '@/contexts/FeatureContext';
import type { Category } from '@/lib/types';

interface FundingProgressIndicatorProps {
  category: Category;
  spent: number;
  fundedThisMonth?: number;
  ytdSpent?: number; // Year-to-date spent (for accumulation categories on dashboard)
  showSpentForAccumulation?: boolean; // If true, show spent instead of funded for accumulation categories
}

export function FundingProgressIndicator({
  category,
  spent,
  fundedThisMonth = 0,
  ytdSpent,
  showSpentForAccumulation = false,
}: FundingProgressIndicatorProps) {
  const monthlyFundingEnabled = useFeature('monthly_funding_tracking');
  const categoryTypesEnabled = useFeature('category_types');

  const budget = category.monthly_amount;
  const remaining = budget - spent;
  const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;

  // Determine what to show based on enabled features
  if (monthlyFundingEnabled && categoryTypesEnabled && category.category_type) {
    return renderCategoryTypeProgress();
  } else if (monthlyFundingEnabled) {
    return renderMonthlyFundingProgress();
  } else {
    return renderDefaultProgress();
  }

  function renderDefaultProgress() {
    if (budget <= 0) {
      return <span className="text-xs text-muted-foreground">No budget set</span>;
    }

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className={getBudgetStatusColor(percentUsed)}>
            {percentUsed.toFixed(0)}% used
          </span>
          <span className="text-muted-foreground">
            {formatCurrency(remaining)} left
          </span>
        </div>
        <div className="relative">
          <Progress value={Math.min(percentUsed, 100)} className="h-2" />
          <div
            className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressBarColor(percentUsed)}`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  function renderMonthlyFundingProgress() {
    const target = category.monthly_target || budget;
    const fundingPercent = target > 0 ? (fundedThisMonth / target) * 100 : 0;
    const fullyFunded = fundedThisMonth >= target;

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className={fullyFunded ? 'text-green-600' : 'text-muted-foreground'}>
            {fullyFunded ? '✓ Fully funded' : `${fundingPercent.toFixed(0)}% funded`}
          </span>
          <span className="text-muted-foreground">
            {formatCurrency(fundedThisMonth)} / {formatCurrency(target)}
          </span>
        </div>
        <div className="relative">
          <Progress value={Math.min(fundingPercent, 100)} className="h-2" />
          <div
            className={`absolute top-0 left-0 h-2 rounded-full transition-all ${
              fullyFunded ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(fundingPercent, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  function renderCategoryTypeProgress() {
    const categoryType = category.category_type || 'monthly_expense';

    switch (categoryType) {
      case 'monthly_expense':
        return renderMonthlyExpenseProgress();
      case 'accumulation':
        return renderAccumulationProgress();
      case 'target_balance':
        return renderTargetBalanceProgress();
      default:
        return renderDefaultProgress();
    }
  }

  function renderMonthlyExpenseProgress() {
    const target = category.monthly_target || budget;
    const fundingPercent = target > 0 ? (fundedThisMonth / target) * 100 : 0;

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            {fundingPercent.toFixed(0)}% funded
          </span>
          <span className="text-muted-foreground">
            {formatCurrency(fundedThisMonth)} / {formatCurrency(target)}
          </span>
        </div>
        <div className="relative">
          <Progress value={Math.min(fundingPercent, 100)} className="h-2" />
          <div
            className="absolute top-0 left-0 h-2 rounded-full transition-all bg-blue-500"
            style={{ width: `${Math.min(fundingPercent, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  function renderAccumulationProgress() {
    const annualTarget = category.annual_target || (budget * 12);
    
    if (showSpentForAccumulation && ytdSpent !== undefined) {
      // Dashboard: Show YTD spent vs annual target
      const ytdSpentPercent = annualTarget > 0 ? (ytdSpent / annualTarget) * 100 : 0;
      
      return (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {ytdSpentPercent.toFixed(0)}% of annual
            </span>
            <span className="text-muted-foreground">
              {formatCurrency(ytdSpent)} / {formatCurrency(annualTarget)}
            </span>
          </div>
          <div className="relative">
            <Progress value={Math.min(ytdSpentPercent, 100)} className="h-2" />
            <div
              className="absolute top-0 left-0 h-2 rounded-full transition-all bg-purple-500"
              style={{ width: `${Math.min(ytdSpentPercent, 100)}%` }}
            />
          </div>
        </div>
      );
    } else {
      // Allocation page: Show YTD funded vs annual target
      const ytdFunded = fundedThisMonth; // TODO: Calculate actual YTD from API
      const ytdPercent = annualTarget > 0 ? (ytdFunded / annualTarget) * 100 : 0;

      return (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {ytdPercent.toFixed(0)}% of annual funding
            </span>
            <span className="text-muted-foreground">
              {formatCurrency(ytdFunded)} / {formatCurrency(annualTarget)}
            </span>
          </div>
          <div className="relative">
            <Progress value={Math.min(ytdPercent, 100)} className="h-2" />
            <div
              className="absolute top-0 left-0 h-2 rounded-full transition-all bg-purple-500"
              style={{ width: `${Math.min(ytdPercent, 100)}%` }}
            />
          </div>
        </div>
      );
    }
  }

  function renderTargetBalanceProgress() {
    const targetBalance = category.target_balance || 0;
    const currentBalance = category.current_balance || 0;
    const balancePercent = targetBalance > 0 ? (currentBalance / targetBalance) * 100 : 0;
    const isComplete = currentBalance >= targetBalance;

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className={isComplete ? 'text-green-600' : 'text-muted-foreground'}>
            {isComplete ? '✓ Target reached' : `${balancePercent.toFixed(0)}% of target`}
          </span>
          <span className="text-muted-foreground">
            {formatCurrency(currentBalance)} / {formatCurrency(targetBalance)}
          </span>
        </div>
        <div className="relative">
          <Progress value={Math.min(balancePercent, 100)} className="h-2" />
          <div
            className={`absolute top-0 left-0 h-2 rounded-full transition-all ${
              isComplete ? 'bg-green-500' : 'bg-orange-500'
            }`}
            style={{ width: `${Math.min(balancePercent, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  function getBudgetStatusColor(percent: number): string {
    if (percent >= 100) return 'text-red-600';
    if (percent >= 80) return 'text-orange-600';
    return 'text-green-600';
  }

  function getProgressBarColor(percent: number): string {
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 80) return 'bg-orange-500';
    return 'bg-green-500';
  }
}


