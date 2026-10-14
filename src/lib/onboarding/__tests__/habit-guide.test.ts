import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeHabitGuideState,
  getNextHabitStep,
  hasFundedEnvelopes,
  isCoreHabitComplete,
  isWithinHabitGuideWindow,
  type HabitGuideMilestones,
} from '../habit-guide';
import type { Category } from '@/lib/types';

function cat(partial: Partial<Category> & { name: string }): Category {
  return {
    id: partial.id ?? 1,
    name: partial.name,
    monthly_amount: partial.monthly_amount ?? 100,
    current_balance: partial.current_balance ?? 0,
    sort_order: 0,
    is_system: partial.is_system ?? false,
    is_buffer: partial.is_buffer ?? false,
    created_at: '',
    updated_at: '',
  };
}

describe('habit-guide milestones', () => {
  it('detects funded envelopes ignoring system/buffer', () => {
    assert.equal(
      hasFundedEnvelopes([
        cat({ name: 'System', is_system: true, current_balance: 50 }),
        cat({ name: 'Buffer', is_buffer: true, current_balance: 50 }),
        cat({ name: 'Groceries', current_balance: 0 }),
      ]),
      false
    );
    assert.equal(hasFundedEnvelopes([cat({ name: 'Groceries', current_balance: 20 })]), true);
  });

  it('orders next step fund → log → check → payday → import', () => {
    const base: HabitGuideMilestones = {
      fund: false,
      log: false,
      check: false,
      paydayDue: false,
      importReady: false,
      importDone: false,
    };
    assert.equal(getNextHabitStep(base), 'fund');
    assert.equal(getNextHabitStep({ ...base, fund: true }), 'log');
    assert.equal(getNextHabitStep({ ...base, fund: true, log: true, importReady: true }), 'check');
    assert.equal(
      getNextHabitStep({
        ...base,
        fund: true,
        log: true,
        check: true,
        paydayDue: true,
        importReady: true,
      }),
      'payday'
    );
    assert.equal(
      getNextHabitStep({
        ...base,
        fund: true,
        log: true,
        check: true,
        paydayDue: false,
        importReady: true,
        importDone: false,
      }),
      'import'
    );
    assert.equal(
      getNextHabitStep({
        ...base,
        fund: true,
        log: true,
        check: true,
        paydayDue: false,
        importReady: true,
        importDone: true,
      }),
      null
    );
  });

  it('treats fund+log as core complete', () => {
    assert.equal(
      isCoreHabitComplete({
        fund: true,
        log: true,
        check: false,
        paydayDue: false,
        importReady: true,
        importDone: false,
      }),
      true
    );
  });

  it('keeps a ~60 day window and stops when disabled', () => {
    const categories = [cat({ name: 'Groceries', current_balance: 0 })];
    const disabled = computeHabitGuideState({
      settings: { habit_guide_enabled: 'false' },
      categories,
      transactionCount: 0,
    });
    assert.equal(disabled.shouldAutoSurface, false);

    const started = new Date();
    started.setUTCDate(started.getUTCDate() - 10);
    const active = computeHabitGuideState({
      settings: { habit_guide_started_at: started.toISOString() },
      categories,
      transactionCount: 0,
    });
    assert.equal(active.shouldAutoSurface, true);
    assert.equal(active.nextStep, 'fund');
    assert.equal(active.withinWindow, true);
    assert.ok(active.daysRemaining <= 50);

    const expiredStart = new Date();
    expiredStart.setUTCDate(expiredStart.getUTCDate() - 61);
    assert.equal(isWithinHabitGuideWindow(expiredStart.toISOString()), false);
    const expired = computeHabitGuideState({
      settings: { habit_guide_started_at: expiredStart.toISOString() },
      categories,
      transactionCount: 0,
    });
    assert.equal(expired.shouldAutoSurface, false);
  });

  it('surfaces payday when available to save after core habits', () => {
    const categories = [cat({ name: 'Groceries', current_balance: 50 })];
    const state = computeHabitGuideState({
      settings: {
        habit_guide_checked_envelope: 'true',
        habit_guide_started_at: new Date().toISOString(),
      },
      categories,
      transactionCount: 2,
      availableToSave: 400,
    });
    assert.equal(state.nextStep, 'payday');
    assert.equal(state.shouldAutoSurface, true);
  });

  it('hides payday for the rest of the day after soft dismiss', () => {
    const categories = [cat({ name: 'Groceries', current_balance: 50 })];
    const now = new Date('2026-08-28T15:00:00.000Z');
    const state = computeHabitGuideState({
      settings: {
        habit_guide_checked_envelope: 'true',
        habit_guide_started_at: '2026-08-01T00:00:00.000Z',
        habit_guide_dismissed_step: JSON.stringify({
          stepId: 'payday',
          at: '2026-08-28T12:00:00.000Z',
        }),
      },
      categories,
      transactionCount: 2,
      availableToSave: 400,
      now,
    });
    assert.notEqual(state.nextStep, 'payday');
  });

  it('hides a soft-dismissed one-time step until milestones advance', () => {
    const categories = [cat({ name: 'Groceries', current_balance: 10 })];
    const state = computeHabitGuideState({
      settings: {
        habit_guide_dismissed_step: JSON.stringify({ stepId: 'log', at: '2026-01-01' }),
        habit_guide_started_at: new Date().toISOString(),
      },
      categories,
      transactionCount: 0,
    });
    assert.equal(state.nextStep, null);
    assert.equal(state.shouldAutoSurface, false);
  });
});
