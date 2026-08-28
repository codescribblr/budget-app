import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExternalTransactionCreate,
  categoryBalanceChange,
} from '../create-transaction';

const context = { budgetAccountId: 22, createdBy: 'user-1' };

describe('buildExternalTransactionCreate', () => {
  it('maps amount and category_id onto total_amount and a split', () => {
    const plan = buildExternalTransactionCreate(
      {
        description: 'Coffee',
        amount: 4.5,
        date: '2026-08-28',
        category_id: 9,
        merchant: 'Starbucks',
        notes: 'ignored',
      },
      context
    );

    assert.deepEqual(plan.transaction, {
      budget_account_id: 22,
      user_id: 'user-1',
      description: 'Coffee',
      total_amount: 4.5,
      date: '2026-08-28',
      account_id: null,
      credit_card_id: null,
      transaction_type: 'expense',
    });
    assert.ok(!('amount' in plan.transaction));
    assert.ok(!('merchant' in plan.transaction));
    assert.ok(!('category_id' in plan.transaction));
    assert.ok(!('notes' in plan.transaction));
    assert.deepEqual(plan.splits, [{ category_id: 9, amount: 4.5 }]);
  });

  it('uses splits when provided and sums total_amount from them', () => {
    const plan = buildExternalTransactionCreate(
      {
        description: 'Split dinner',
        amount: 999,
        date: '2026-08-28',
        transaction_type: 'expense',
        splits: [
          { category_id: 1, amount: 20 },
          { category_id: 2, amount: 15 },
        ],
      },
      context
    );

    assert.equal(plan.transaction.total_amount, 35);
    assert.equal(plan.splits.length, 2);
  });

  it('rejects a body with no category and no splits', () => {
    assert.throws(
      () =>
        buildExternalTransactionCreate(
          { description: 'No category', amount: 10, date: '2026-08-28' },
          context
        ),
      /splits, or category_id and amount/
    );
  });

  it('rejects linking both a bank account and a credit card', () => {
    assert.throws(
      () =>
        buildExternalTransactionCreate(
          {
            description: 'Bad',
            amount: 10,
            date: '2026-08-28',
            category_id: 1,
            account_id: 3,
            credit_card_id: 4,
          },
          context
        ),
      /both an account and a credit card/
    );
  });
});

describe('categoryBalanceChange', () => {
  it('subtracts expenses and adds income', () => {
    assert.equal(categoryBalanceChange('expense', 25), -25);
    assert.equal(categoryBalanceChange('income', 25), 25);
  });
});
