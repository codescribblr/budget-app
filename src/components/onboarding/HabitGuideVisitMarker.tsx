'use client';

import { useEffect, useRef } from 'react';
import { useHabitGuide } from '@/hooks/use-habit-guide';
import type { Category } from '@/lib/types';

/** Marks the “check an envelope” milestone when the user visits Budgets after funding + logging. */
export function HabitGuideVisitMarker({ categories }: { categories: Category[] }) {
  const { loading, state, markChecked } = useHabitGuide({ categories });
  const didMark = useRef(false);

  useEffect(() => {
    if (loading || didMark.current) return;
    if (
      state.enabled &&
      !state.checkedEnvelope &&
      state.milestones.fund &&
      state.milestones.log
    ) {
      didMark.current = true;
      void markChecked();
    }
  }, [loading, state.enabled, state.checkedEnvelope, state.milestones.fund, state.milestones.log, markChecked]);

  return null;
}
