import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { transactionMatchesListFilters, type TransactionListFilters } from '../transaction-list-filters';
import type { TransactionWithSplits } from '../types';

const emptyFilters: TransactionListFilters = {
  categoryIds: [],
  accountIds: [],
  creditCardIds: [],
  transactionTypes: [],
  merchantGroupIds: [],
  tagIds: [],
  startDate: null,
  endDate: null,
};

function transaction(overrides: Partial<TransactionWithSplits> = {}): TransactionWithSplits {
  return {
    id: 1,
    date: '2026-09-01',
    description: 'Rent',
    total_amount: 100,
    transaction_type: 'expense',
    account_id: 7,
    credit_card_id: null,
    is_historical: false,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    splits: [{
      id: 1,
      transaction_id: 1,
      category_id: 4,
      amount: 100,
      category_name: 'Housing',
      created_at: '2026-09-01T00:00:00Z',
    }],
    ...overrides,
  };
}

describe('transactionMatchesListFilters', () => {
  it('keeps an account-filtered transaction after its category changes', () => {
    const filters = { ...emptyFilters, accountIds: [7] };
    const updated = transaction({
      splits: [{
        id: 1,
        transaction_id: 1,
        category_id: 9,
        amount: 100,
        category_name: 'Repairs',
        created_at: '2026-09-01T00:00:00Z',
      }],
    });

    assert.equal(transactionMatchesListFilters(updated, filters), true);
  });

  it('drops a transaction moved off the filtered account', () => {
    const filters = { ...emptyFilters, accountIds: [7] };
    assert.equal(transactionMatchesListFilters(transaction({ account_id: 8 }), filters), false);
  });

  it('drops a transaction moved out of the filtered category', () => {
    const filters = { ...emptyFilters, categoryIds: [4] };
    const updated = transaction({
      splits: [{
        id: 1,
        transaction_id: 1,
        category_id: 9,
        amount: 100,
        category_name: 'Repairs',
        created_at: '2026-09-01T00:00:00Z',
      }],
    });

    assert.equal(transactionMatchesListFilters(updated, filters), false);
  });

  it('matches a credit card filter', () => {
    const filters = { ...emptyFilters, creditCardIds: [3] };
    assert.equal(
      transactionMatchesListFilters(transaction({ account_id: null, credit_card_id: 3 }), filters),
      true,
    );
    assert.equal(
      transactionMatchesListFilters(transaction({ account_id: 7, credit_card_id: null }), filters),
      false,
    );
  });
});
