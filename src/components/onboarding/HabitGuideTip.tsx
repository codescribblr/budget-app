'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useHabitGuide } from '@/hooks/use-habit-guide';
import type { HabitGuideStepId } from '@/lib/onboarding/habit-guide';
import type { Category } from '@/lib/types';

interface HabitGuideTipProps {
  tipId: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string | null;
  /** Milestone this tip advances when dismissed with Got it (optional). */
  completeStep?: HabitGuideStepId;
  categories?: Category[];
  availableToSave?: number;
  /** Only show when habit guide would auto-surface and this condition holds. */
  showWhen?:
    | 'always'
    | 'empty-transactions'
    | 'after-first-transaction'
    | 'money-movement'
    | 'payday';
  transactionCount?: number;
}

export function HabitGuideTip({
  tipId,
  message,
  ctaLabel = 'Learn more',
  ctaHref,
  completeStep,
  categories = [],
  availableToSave,
  showWhen = 'always',
  transactionCount: txnProp,
}: HabitGuideTipProps) {
  const {
    loading,
    state,
    transactionCount,
    dismissForNow,
    dontShowAgain,
    markChecked,
    completeGuide,
    recordTipShown,
  } = useHabitGuide({ categories, transactionCount: txnProp, availableToSave });

  const eligible =
    !loading &&
    state.enabled &&
    !state.completed &&
    state.withinWindow &&
    (() => {
      if (showWhen === 'empty-transactions') return transactionCount === 0;
      if (showWhen === 'after-first-transaction') return transactionCount >= 1;
      if (showWhen === 'money-movement') {
        return (
          !state.milestones.fund ||
          state.nextStep === 'fund' ||
          state.nextStep === 'payday' ||
          state.milestones.paydayDue
        );
      }
      if (showWhen === 'payday') {
        return state.nextStep === 'payday' || state.milestones.paydayDue;
      }
      return state.shouldAutoSurface || transactionCount === 0 || !state.milestones.log;
    })();

  const mappedStep: HabitGuideStepId | null =
    tipId === 'transactions'
      ? 'log'
      : tipId === 'money-movement'
        ? state.nextStep === 'payday' || state.milestones.paydayDue
          ? 'payday'
          : 'fund'
        : tipId === 'import'
          ? 'import'
          : completeStep || null;

  const softDismissed =
    mappedStep &&
    state.dismissedStep?.stepId === mappedStep &&
    (mappedStep === 'payday'
      ? state.nextStep !== 'payday'
      : state.nextStep === null);

  useEffect(() => {
    if (eligible && !softDismissed) {
      void recordTipShown(`tip-${tipId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, softDismissed, tipId]);

  if (!eligible || softDismissed) return null;

  const handleGotIt = async () => {
    if (completeStep === 'check') {
      await markChecked();
    } else if (completeStep === 'import' || tipId === 'import') {
      await completeGuide();
    } else if (mappedStep) {
      await dismissForNow(mappedStep);
    }
  };

  return (
    <div
      data-testid="habit-guide-tip"
      className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-muted/60 border border-border text-sm"
    >
      <span className="text-muted-foreground">{message}</span>
      <div className="flex items-center gap-2 shrink-0">
        {ctaHref ? (
          <Button variant="link" size="sm" className="h-auto p-0 text-primary" asChild>
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground"
          onClick={() => void handleGotIt()}
        >
          Got it
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground"
          onClick={() => void dontShowAgain()}
        >
          Don’t show habit tips
        </Button>
      </div>
    </div>
  );
}
