'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Rocket, DollarSign, Wallet, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Category } from '@/lib/types';

interface WizardCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onOpenEditCategory?: (category: Category) => void;
  incomeSettings?: {
    annual_income?: string;
    annual_salary?: string;
  };
  hasIncomeConfigured?: boolean;
}

export function WizardCompletionDialog({
  open,
  onOpenChange,
  categories,
  onOpenEditCategory,
  incomeSettings = {},
  hasIncomeConfigured: hasIncomeConfiguredProp,
}: WizardCompletionDialogProps) {
  const router = useRouter();

  // Filter out system and buffer categories
  const userCategories = categories?.filter(
    (cat) => cat && !cat.is_system && !cat.is_buffer
  ) || [];

  // Check completion status
  const hasBudgetSet = userCategories.some(cat => cat.monthly_amount > 0);
  const hasFundedCategories = userCategories.some(cat => cat.current_balance > 0);
  const hasIncomeConfigured = hasIncomeConfiguredProp ?? parseFloat(incomeSettings.annual_income || incomeSettings.annual_salary || '0') > 0;

  // Find first category without a budget (monthly_amount === 0)
  const firstCategoryWithoutBudget = userCategories.find(
    (cat) => cat.monthly_amount === 0
  );

  const handleSetBudget = () => {
    // Only proceed if we have a valid category and the callback function
    if (firstCategoryWithoutBudget && firstCategoryWithoutBudget.name && onOpenEditCategory) {
      try {
        onOpenEditCategory(firstCategoryWithoutBudget);
        onOpenChange(false);
      } catch (error) {
        console.error('Error opening edit dialog:', error);
        // Fallback to categories page
        router.push('/categories');
        onOpenChange(false);
      }
    } else {
      // Fallback to categories page if no category found or callback not available
      router.push('/categories');
      onOpenChange(false);
    }
  };

  const handleFundCategories = () => {
    router.push('/money-movement');
    onOpenChange(false);
  };

  const handleIncomeSettings = () => {
    router.push('/income');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Budget Setup Complete!</DialogTitle>
              <DialogDescription className="text-base mt-1">
                {hasBudgetSet && hasFundedCategories && hasIncomeConfigured
                  ? "All setup tasks are complete! You're ready to start budgeting."
                  : "Your accounts and categories have been created. Here's what you can do next:"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Option 1: Set Budgets - Only show if not complete */}
          {!hasBudgetSet && (
            <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Set Monthly Budgets</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  If you know what next month's income looks like, set monthly budget amounts for your categories.
                </p>
                <Button onClick={handleSetBudget} size="sm" className="w-full sm:w-auto">
                  Set Budget for {firstCategoryWithoutBudget?.name || 'Categories'}
                </Button>
              </div>
            </div>
          </div>
          )}

          {/* Option 2: Fund Categories - Only show if not complete */}
          {!hasFundedCategories && (
            <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Fund Your Categories</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Allocate the money you currently have in your accounts to your budget categories.
                </p>
                <Button onClick={handleFundCategories} size="sm" variant="outline" className="w-full sm:w-auto">
                  Go to Money Movement
                </Button>
              </div>
            </div>
          </div>
          )}

          {/* Option 3: Income Settings - Only show if not complete */}
          {!hasIncomeConfigured && (
            <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Configure Income Details</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Enter more information about your income (pay frequency, tax rate, deductions) for more accurate monthly budget targets.
                </p>
                <Button onClick={handleIncomeSettings} size="sm" variant="outline" className="w-full sm:w-auto">
                  Go to Income Settings
                </Button>
              </div>
            </div>
          </div>
          )}

          {/* Show message if all tasks are complete */}
          {hasBudgetSet && hasFundedCategories && hasIncomeConfigured && (
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <Rocket className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1 text-green-900 dark:text-green-100">All Set!</h3>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    You've completed all the setup tasks. Your budget is ready to use!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="ghost">
            I'll do this later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
