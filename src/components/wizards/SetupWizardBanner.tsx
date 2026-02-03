'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Rocket, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { Category } from '@/lib/types';

interface SetupWizardBannerProps {
  categories: Category[];
}

export function SetupWizardBanner({ categories }: SetupWizardBannerProps) {
  const [hasSkipped, setHasSkipped] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSkipStatus = async () => {
      try {
        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          setHasSkipped(settings?.budget_wizard_skipped === 'true');
        }
      } catch (error) {
        console.error('Error checking skip status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSkipStatus();
  }, []);

  if (loading) {
    return null;
  }

  // Don't show if user hasn't skipped
  if (!hasSkipped) {
    return null;
  }

  // Filter out system categories
  const userCategories = categories.filter((cat) => !cat.is_system && !cat.is_buffer);

  // Count categories with positive non-zero balance (funded)
  const fundedCategoriesCount = userCategories.filter(
    (cat) => cat.current_balance > 0
  ).length;

  // Count categories with zero balance (unfunded)
  const unfundedCategoriesCount = userCategories.filter(
    (cat) => cat.current_balance === 0
  ).length;

  // Hide banner if user has 1+ funded category OR 3+ unfunded categories
  if (fundedCategoriesCount >= 1 || unfundedCategoriesCount >= 3) {
    return null;
  }

  return (
    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 mb-4">
      <Rocket className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex-1">
          <span className="font-semibold text-blue-900 dark:text-blue-100">
            Need help setting up your budget?
          </span>
          <span className="text-blue-800 dark:text-blue-200 ml-2">
            Use our setup wizard to quickly configure your accounts, income, and categories.
          </span>
        </div>
        <div className="flex gap-2">
          <Link href="/help/wizards/budget-setup">
            <Button size="sm" variant="default">
              Run Setup Wizard
            </Button>
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  );
}
