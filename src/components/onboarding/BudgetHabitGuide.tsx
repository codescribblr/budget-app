'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Compass, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useHabitGuide } from '@/hooks/use-habit-guide';
import { getMilestoneCopy } from '@/lib/onboarding/habit-guide';
import {
  HABIT_EXIT_REOPEN_HINT,
  HABIT_GUIDE_HELP_HREF,
  HABIT_GUIDE_TITLE,
} from '@/lib/onboarding/habit-guide-copy';
import type { Category } from '@/lib/types';

interface BudgetHabitGuideProps {
  categories: Category[];
  transactionCount?: number;
  availableToSave?: number;
}

export function BudgetHabitGuide({
  categories,
  transactionCount,
  availableToSave,
}: BudgetHabitGuideProps) {
  const {
    loading,
    state,
    dismissForNow,
    dontShowAgain,
    markChecked,
    completeGuide,
    recordTipShown,
  } = useHabitGuide({ categories, transactionCount, availableToSave });

  const nextStep = state.shouldAutoSurface ? state.nextStep : null;
  const copy = nextStep ? getMilestoneCopy(nextStep) : null;

  useEffect(() => {
    if (!loading && nextStep) {
      void recordTipShown(nextStep);
    }
    // Intentionally only when the surfaced step changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, nextStep]);

  if (loading || !copy || !nextStep) {
    return null;
  }

  const handlePrimary = async () => {
    if (nextStep === 'check') {
      await markChecked();
    } else if (nextStep === 'import') {
      await completeGuide();
    } else if (nextStep === 'payday') {
      await dismissForNow('payday');
    }
  };

  const handleDismiss = async () => {
    if (nextStep === 'import') {
      await completeGuide();
    } else {
      await dismissForNow(nextStep);
    }
  };

  return (
    <Alert className="border-primary/20 bg-primary/5 mb-4" data-testid="budget-habit-guide">
      <Compass className="h-4 w-4 text-primary" />
      <AlertDescription>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 space-y-1 pr-2">
            <div className="font-semibold text-foreground">{HABIT_GUIDE_TITLE}</div>
            <div className="text-sm font-medium text-foreground">{copy.title}</div>
            <p className="text-sm text-muted-foreground">{copy.body}</p>
            <p className="text-xs text-muted-foreground">
              {HABIT_EXIT_REOPEN_HINT}
              {state.withinWindow && state.daysRemaining < 60
                ? ` Tips stay on for about ${state.daysRemaining} more day${state.daysRemaining === 1 ? '' : 's'}.`
                : ' Tips stay on for your first couple of months.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button size="sm" asChild>
              <Link
                href={copy.href}
                onClick={() => {
                  void handlePrimary();
                }}
              >
                {copy.ctaLabel}
              </Link>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void handleDismiss()}>
              Dismiss for now
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => void dontShowAgain()}
              title="Don’t show habit tips"
            >
              <X className="h-4 w-4 mr-1" />
              Don’t show habit tips
            </Button>
            <Button asChild size="sm" variant="link" className="h-auto p-0">
              <Link href={HABIT_GUIDE_HELP_HREF}>Help</Link>
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
