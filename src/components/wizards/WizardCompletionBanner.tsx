'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Rocket, CheckCircle } from 'lucide-react';
import type { Category } from '@/lib/types';

interface WizardCompletionBannerProps {
  categories: Category[];
  incomeSettings?: {
    annual_income?: string;
    annual_salary?: string;
  };
  hasIncomeConfigured?: boolean;
  onOpenDialog: () => void;
}

export function WizardCompletionBanner({
  categories,
  incomeSettings = {},
  hasIncomeConfigured: hasIncomeConfiguredProp,
  onOpenDialog,
}: WizardCompletionBannerProps) {
  const [hasWizardCompleted, setHasWizardCompleted] = useState(false);
  const [wasDismissed, setWasDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCompletionStatus = async () => {
      try {
        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          const completed = !!settings?.budget_wizard_completed;
          setHasWizardCompleted(completed);
          
          // Check if the initial dialog was dismissed
          if (completed) {
            const completionTime = settings.budget_wizard_completed;
            const dismissedKey = `wizard-completion-dismissed-${completionTime}`;
            setWasDismissed(localStorage.getItem(dismissedKey) === 'true');
          }
        }
      } catch (error) {
        console.error('Error checking completion status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkCompletionStatus();
  }, []);

  if (loading || !hasWizardCompleted || !wasDismissed) {
    return null;
  }

  // Filter out system and buffer categories
  const userCategories = categories.filter(
    (cat) => cat && !cat.is_system && !cat.is_buffer
  );

  // Check completion status
  const hasBudgetSet = userCategories.some(cat => cat.monthly_amount > 0);
  const hasFundedCategories = userCategories.some(cat => cat.current_balance > 0);
  const hasIncomeConfigured = hasIncomeConfiguredProp ?? parseFloat(incomeSettings.annual_income || incomeSettings.annual_salary || '0') > 0;

  // Only show banner if not all tasks are complete
  if (hasBudgetSet && hasFundedCategories && hasIncomeConfigured) {
    return null;
  }

  const incompleteTasks = [];
  if (!hasBudgetSet) incompleteTasks.push('Set Budgets');
  if (!hasFundedCategories) incompleteTasks.push('Fund Categories');
  if (!hasIncomeConfigured) incompleteTasks.push('Configure Income');

  return (
    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 mb-4">
      <Rocket className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex-1">
          <span className="font-semibold text-blue-900 dark:text-blue-100">
            Complete your budget setup
          </span>
          <span className="text-blue-800 dark:text-blue-200 ml-2">
            {incompleteTasks.length === 1
              ? `Finish setting up: ${incompleteTasks[0]}`
              : `Finish setting up: ${incompleteTasks.slice(0, -1).join(', ')} and ${incompleteTasks[incompleteTasks.length - 1]}`}
          </span>
        </div>
        <Button onClick={onOpenDialog} size="sm" variant="default" className="shrink-0">
          Continue Setup
        </Button>
      </AlertDescription>
    </Alert>
  );
}
