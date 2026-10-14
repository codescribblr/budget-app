'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Category } from '@/lib/types';
import {
  HABIT_GUIDE_KEYS,
  computeHabitGuideState,
  dismissStepSettings,
  disableHabitGuideSettings,
  incrementInteractionsSettings,
  markCheckedEnvelopeSettings,
  markHabitGuideCompletedSettings,
  reopenHabitGuideSettings,
  saveHabitGuideSettings,
  stampHabitGuideStartedSettings,
  type HabitGuideComputed,
  type HabitGuideStepId,
} from '@/lib/onboarding/habit-guide';

interface UseHabitGuideOptions {
  categories?: Category[];
  /** When omitted, fetches a lightweight transaction count. */
  transactionCount?: number;
  /** Available to Save — drives recurring payday tip. */
  availableToSave?: number;
  /** Skip auto-fetch (e.g. help page that only needs reopen). */
  skipDataFetch?: boolean;
}

export function useHabitGuide(options: UseHabitGuideOptions = {}) {
  const {
    categories = [],
    transactionCount: txnCountProp,
    availableToSave: availableProp,
    skipDataFetch,
  } = options;
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [transactionCount, setTransactionCount] = useState(txnCountProp ?? 0);
  const [availableToSave, setAvailableToSave] = useState(availableProp ?? 0);
  const [loading, setLoading] = useState(true);
  const countedRef = useRef<string | null>(null);
  const stampedStartRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const fetches: Promise<Response>[] = [fetch('/api/settings')];
      if (txnCountProp === undefined && !skipDataFetch) {
        fetches.push(fetch('/api/transactions?page=1&pageSize=1'));
      }
      if (availableProp === undefined && !skipDataFetch) {
        fetches.push(fetch('/api/dashboard'));
      }
      const responses = await Promise.all(fetches);
      const settingsRes = responses[0];
      let idx = 1;
      const txnRes =
        txnCountProp === undefined && !skipDataFetch ? responses[idx++] : undefined;
      const dashRes =
        availableProp === undefined && !skipDataFetch ? responses[idx++] : undefined;

      if (settingsRes.ok) {
        const nextSettings = await settingsRes.json();
        setSettings(nextSettings);
        // Stamp start date once when guide is on and missing a window start
        if (
          !stampedStartRef.current &&
          nextSettings[HABIT_GUIDE_KEYS.enabled] !== 'false' &&
          !nextSettings[HABIT_GUIDE_KEYS.startedAt] &&
          !nextSettings.budget_wizard_completed &&
          !nextSettings.ai_onboarding_completed
        ) {
          // leave unset; wizard timestamps still resolve via resolveHabitGuideStartedAt
        } else if (
          !stampedStartRef.current &&
          nextSettings[HABIT_GUIDE_KEYS.enabled] !== 'false' &&
          !nextSettings[HABIT_GUIDE_KEYS.startedAt]
        ) {
          const stamp = stampHabitGuideStartedSettings(null);
          if (stamp.length) {
            stampedStartRef.current = true;
            void saveHabitGuideSettings(stamp);
            setSettings((prev) => ({ ...prev, [HABIT_GUIDE_KEYS.startedAt]: stamp[0].value }));
          }
        }
      }
      if (txnRes?.ok) {
        const data = await txnRes.json();
        const total =
          typeof data.total === 'number'
            ? data.total
            : Array.isArray(data.transactions)
              ? data.transactions.length
              : Array.isArray(data)
                ? data.length
                : 0;
        setTransactionCount(total);
      } else if (txnCountProp !== undefined) {
        setTransactionCount(txnCountProp);
      }
      if (dashRes?.ok) {
        const dash = await dashRes.json();
        const ats =
          typeof dash.current_savings === 'number'
            ? dash.current_savings
            : typeof dash.available_to_save === 'number'
              ? dash.available_to_save
              : 0;
        setAvailableToSave(ats);
      } else if (availableProp !== undefined) {
        setAvailableToSave(availableProp);
      }
    } catch (error) {
      console.error('Error loading habit guide state:', error);
    } finally {
      setLoading(false);
    }
  }, [availableProp, skipDataFetch, txnCountProp]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (txnCountProp !== undefined) {
      setTransactionCount(txnCountProp);
    }
  }, [txnCountProp]);

  useEffect(() => {
    if (availableProp !== undefined) {
      setAvailableToSave(availableProp);
    }
  }, [availableProp]);

  const state: HabitGuideComputed = computeHabitGuideState({
    settings,
    categories,
    transactionCount,
    availableToSave,
  });

  const patchLocal = (updates: Array<{ key: string; value: string }>) => {
    setSettings((prev) => {
      const next = { ...prev };
      for (const u of updates) {
        if (u.value === '') {
          delete next[u.key];
        } else {
          next[u.key] = u.value;
        }
      }
      return next;
    });
  };

  const apply = async (updates: Array<{ key: string; value: string }>) => {
    patchLocal(updates);
    await saveHabitGuideSettings(updates);
  };

  const dismissForNow = async (stepId: HabitGuideStepId) => {
    await apply(dismissStepSettings(stepId));
  };

  const dontShowAgain = async () => {
    await apply(disableHabitGuideSettings());
  };

  const reopen = async () => {
    await apply(reopenHabitGuideSettings());
  };

  const markChecked = async () => {
    await apply([
      ...markCheckedEnvelopeSettings(),
      { key: HABIT_GUIDE_KEYS.dismissedStep, value: '' },
    ]);
  };

  const completeGuide = async () => {
    await apply(markHabitGuideCompletedSettings());
  };

  const recordTipShown = async (stepId: HabitGuideStepId | string) => {
    const guardKey = `habit-guide-counted-${stepId}`;
    if (typeof window !== 'undefined') {
      try {
        if (sessionStorage.getItem(guardKey) === '1') return;
        sessionStorage.setItem(guardKey, '1');
      } catch {
        if (countedRef.current === stepId) return;
        countedRef.current = stepId;
      }
    }
    const updates = incrementInteractionsSettings(state.interactions);
    await apply(updates);
  };

  return {
    loading,
    state,
    settings,
    transactionCount,
    availableToSave,
    refresh,
    dismissForNow,
    dontShowAgain,
    reopen,
    markChecked,
    completeGuide,
    recordTipShown,
    apply,
  };
}
