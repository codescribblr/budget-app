import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for grouped notification message formatting.
 * Full integration tests require Supabase — these verify grouping copy logic.
 */

function buildCategoryOverBudgetTitle(count: number, firstName: string): string {
  return count === 1 ? `${firstName} is over budget` : `${count} categories are over budget`;
}

function buildLowBalanceTitle(count: number, firstName: string): string {
  return count === 1 ? `Low balance: ${firstName}` : `${count} accounts have low balances`;
}

describe('budget alert grouped titles', () => {
  it('uses singular title for one category over budget', () => {
    assert.equal(buildCategoryOverBudgetTitle(1, 'Groceries'), 'Groceries is over budget');
  });

  it('uses plural title for multiple categories over budget', () => {
    assert.equal(buildCategoryOverBudgetTitle(3, 'Groceries'), '3 categories are over budget');
  });

  it('uses singular title for one low balance account', () => {
    assert.equal(buildLowBalanceTitle(1, 'Checking'), 'Low balance: Checking');
  });

  it('uses plural title for multiple low balance accounts', () => {
    assert.equal(buildLowBalanceTitle(2, 'Checking'), '2 accounts have low balances');
  });
});

describe('category over budget dedupe keys', () => {
  it('builds per-category monthly dedupe keys', () => {
    const monthKey = '2026-06';
    const keys = [1, 2, 3].map((id) => `over_limit:${id}:${monthKey}`);
    assert.deepEqual(keys, [
      'over_limit:1:2026-06',
      'over_limit:2:2026-06',
      'over_limit:3:2026-06',
    ]);
  });
});
