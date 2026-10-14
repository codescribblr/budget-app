import type { Category } from '@/lib/types';
import { HABIT_MILESTONE_COPY } from './habit-guide-copy';

/** Account-scoped settings keys for the Budget Habit Guide. */
export const HABIT_GUIDE_KEYS = {
  enabled: 'habit_guide_enabled',
  dismissedStep: 'habit_guide_dismissed_step',
  interactions: 'habit_guide_interactions',
  completed: 'habit_guide_completed',
  checkedEnvelope: 'habit_guide_checked_envelope',
  /** ISO timestamp when the guide window started (wizard/AI complete or reopen). */
  startedAt: 'habit_guide_started_at',
} as const;

/** Keep auto-surfacing tips for about two months after start. */
export const HABIT_GUIDE_DURATION_DAYS = 60;

export type HabitGuideStepId = 'fund' | 'log' | 'check' | 'payday' | 'import';

export interface HabitGuideMilestones {
  fund: boolean;
  log: boolean;
  check: boolean;
  /** Recurring: money waiting in Available to Save after first fund. */
  paydayDue: boolean;
  /** Soft unlock after log; never required for "core complete". */
  importReady: boolean;
  importDone: boolean;
}

export interface HabitGuideDismissedStep {
  stepId: HabitGuideStepId;
  at: string;
}

export interface HabitGuideComputed {
  /** Explicit false disables auto-surface; unset/true allows it. */
  enabled: boolean;
  interactions: number;
  completed: boolean;
  checkedEnvelope: boolean;
  startedAt: string | null;
  /** Days remaining in the ~2 month window (0 if expired/unknown). */
  daysRemaining: number;
  withinWindow: boolean;
  dismissedStep: HabitGuideDismissedStep | null;
  milestones: HabitGuideMilestones;
  /** Next incomplete core/soft step to show, or null if nothing to show. */
  nextStep: HabitGuideStepId | null;
  /** Whether UI should auto-surface tips/cards right now. */
  shouldAutoSurface: boolean;
}

const STEP_IDS: HabitGuideStepId[] = ['fund', 'log', 'check', 'payday', 'import'];

export function parseHabitGuideDismissedStep(
  raw: string | undefined | null
): HabitGuideDismissedStep | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<HabitGuideDismissedStep>;
    if (parsed.stepId && STEP_IDS.includes(parsed.stepId as HabitGuideStepId)) {
      return {
        stepId: parsed.stepId as HabitGuideStepId,
        at: parsed.at || new Date().toISOString(),
      };
    }
  } catch {
    if (STEP_IDS.includes(raw as HabitGuideStepId)) {
      return { stepId: raw as HabitGuideStepId, at: new Date().toISOString() };
    }
  }
  return null;
}

export function hasFundedEnvelopes(categories: Category[]): boolean {
  return categories.some(
    (cat) => cat && !cat.is_system && !cat.is_buffer && Number(cat.current_balance) > 0
  );
}

export function daysSinceIso(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null;
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return null;
  const ms = now.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function isWithinHabitGuideWindow(
  startedAt: string | null | undefined,
  now = new Date()
): boolean {
  const days = daysSinceIso(startedAt, now);
  if (days === null) return true; // unset → treat as active until we stamp a start
  return days >= 0 && days < HABIT_GUIDE_DURATION_DAYS;
}

export function habitGuideDaysRemaining(
  startedAt: string | null | undefined,
  now = new Date()
): number {
  const days = daysSinceIso(startedAt, now);
  if (days === null) return HABIT_GUIDE_DURATION_DAYS;
  return Math.max(0, HABIT_GUIDE_DURATION_DAYS - days);
}

/** Payday soft-dismiss lasts the rest of the calendar day only. */
export function isStepSoftDismissed(
  dismissed: HabitGuideDismissedStep | null,
  stepId: HabitGuideStepId,
  now = new Date()
): boolean {
  if (!dismissed || dismissed.stepId !== stepId) return false;
  if (stepId === 'payday') {
    const day = dismissed.at.slice(0, 10);
    const today = now.toISOString().slice(0, 10);
    return day === today;
  }
  return true;
}

export function computeHabitGuideMilestones(input: {
  categories: Category[];
  transactionCount: number;
  checkedEnvelope: boolean;
  availableToSave?: number;
  importDismissedOrDone?: boolean;
}): HabitGuideMilestones {
  const fund = hasFundedEnvelopes(input.categories);
  const log = input.transactionCount >= 1;
  const available = Number(input.availableToSave ?? 0);
  return {
    fund,
    log,
    check: input.checkedEnvelope,
    paydayDue: fund && available > 0.009,
    importReady: log,
    importDone: Boolean(input.importDismissedOrDone),
  };
}

/**
 * Order: first fund → log → check → (recurring payday when ATS > 0) → soft import.
 * Show only the next incomplete step.
 */
export function getNextHabitStep(milestones: HabitGuideMilestones): HabitGuideStepId | null {
  if (!milestones.fund) return 'fund';
  if (!milestones.log) return 'log';
  if (!milestones.check) return 'check';
  if (milestones.paydayDue) return 'payday';
  if (milestones.importReady && !milestones.importDone) return 'import';
  return null;
}

export function isCoreHabitComplete(milestones: HabitGuideMilestones): boolean {
  return milestones.fund && milestones.log;
}

export function resolveHabitGuideStartedAt(settings: Record<string, string>): string | null {
  return (
    settings[HABIT_GUIDE_KEYS.startedAt] ||
    settings.budget_wizard_completed ||
    settings.ai_onboarding_completed ||
    null
  );
}

export function computeHabitGuideState(input: {
  settings: Record<string, string>;
  categories: Category[];
  transactionCount: number;
  availableToSave?: number;
  now?: Date;
}): HabitGuideComputed {
  const now = input.now ?? new Date();
  const settings = input.settings;
  const enabledRaw = settings[HABIT_GUIDE_KEYS.enabled];
  const enabled = enabledRaw !== 'false';
  const interactions = Math.max(0, parseInt(settings[HABIT_GUIDE_KEYS.interactions] || '0', 10) || 0);
  const completed = settings[HABIT_GUIDE_KEYS.completed] === 'true';
  const checkedEnvelope = settings[HABIT_GUIDE_KEYS.checkedEnvelope] === 'true';
  const startedAt = resolveHabitGuideStartedAt(settings);
  const withinWindow = isWithinHabitGuideWindow(startedAt, now);
  const daysRemaining = habitGuideDaysRemaining(startedAt, now);
  const dismissedStep = parseHabitGuideDismissedStep(settings[HABIT_GUIDE_KEYS.dismissedStep]);

  const milestones = computeHabitGuideMilestones({
    categories: input.categories,
    transactionCount: input.transactionCount,
    checkedEnvelope,
    availableToSave: input.availableToSave,
    importDismissedOrDone: dismissedStep?.stepId === 'import',
  });

  let nextStep = getNextHabitStep({
    ...milestones,
    importDone: milestones.importDone || completed,
  });

  if (nextStep && isStepSoftDismissed(dismissedStep, nextStep, now)) {
    // Payday: hide for today. Other steps: skip to next logical tip if any.
    if (nextStep === 'payday') {
      nextStep = milestones.importReady && !milestones.importDone ? 'import' : null;
      if (nextStep === 'import' && isStepSoftDismissed(dismissedStep, 'import', now)) {
        nextStep = null;
      }
    } else {
      nextStep = null;
    }
  }

  const shouldAutoSurface =
    enabled && !completed && withinWindow && nextStep !== null;

  return {
    enabled,
    interactions,
    completed,
    checkedEnvelope,
    startedAt,
    daysRemaining,
    withinWindow,
    dismissedStep,
    milestones,
    nextStep,
    shouldAutoSurface,
  };
}

export function getMilestoneCopy(stepId: HabitGuideStepId) {
  return HABIT_MILESTONE_COPY[stepId];
}

/** Persist one or more habit-guide settings via the settings API. */
export async function saveHabitGuideSettings(
  updates: Array<{ key: string; value: string }>
): Promise<boolean> {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: updates }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function stampHabitGuideStartedSettings(
  existingStartedAt?: string | null
): Array<{ key: string; value: string }> {
  if (existingStartedAt) return [];
  return [{ key: HABIT_GUIDE_KEYS.startedAt, value: new Date().toISOString() }];
}

export function reopenHabitGuideSettings(): Array<{ key: string; value: string }> {
  return [
    { key: HABIT_GUIDE_KEYS.enabled, value: 'true' },
    { key: HABIT_GUIDE_KEYS.completed, value: 'false' },
    { key: HABIT_GUIDE_KEYS.dismissedStep, value: '' },
    { key: HABIT_GUIDE_KEYS.startedAt, value: new Date().toISOString() },
  ];
}

export function disableHabitGuideSettings(): Array<{ key: string; value: string }> {
  return [{ key: HABIT_GUIDE_KEYS.enabled, value: 'false' }];
}

export function dismissStepSettings(stepId: HabitGuideStepId): Array<{ key: string; value: string }> {
  return [
    {
      key: HABIT_GUIDE_KEYS.dismissedStep,
      value: JSON.stringify({ stepId, at: new Date().toISOString() }),
    },
  ];
}

export function incrementInteractionsSettings(
  current: number
): Array<{ key: string; value: string }> {
  return [{ key: HABIT_GUIDE_KEYS.interactions, value: String(current + 1) }];
}

export function markCheckedEnvelopeSettings(): Array<{ key: string; value: string }> {
  return [{ key: HABIT_GUIDE_KEYS.checkedEnvelope, value: 'true' }];
}

export function markHabitGuideCompletedSettings(): Array<{ key: string; value: string }> {
  return [
    { key: HABIT_GUIDE_KEYS.completed, value: 'true' },
    { key: HABIT_GUIDE_KEYS.dismissedStep, value: '' },
  ];
}

/** Settings to write when wizard/AI onboarding finishes. */
export function enableHabitGuideOnSetupSettings(): Array<{ key: string; value: string }> {
  const now = new Date().toISOString();
  return [
    { key: HABIT_GUIDE_KEYS.enabled, value: 'true' },
    { key: HABIT_GUIDE_KEYS.startedAt, value: now },
  ];
}
