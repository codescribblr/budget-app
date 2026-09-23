import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  splitRowsDiffer,
  splitsAffectEnvelopesDifferently,
  splitsAfterCategoryMove,
} from '../category-transaction-edits';

describe('splitsAfterCategoryMove', () => {
  it('replaces a single-category transaction with one split for the full amount', () => {
    const next = splitsAfterCategoryMove({
      splits: [{ category_id: 4, amount: 40 }],
      totalAmount: 40,
      fromCategoryId: 4,
      toCategoryId: 9,
    });

    assert.deepEqual(next, [{ category_id: 9, amount: 40 }]);
  });

  it('uses the transaction total when this category is the only assignment', () => {
    const next = splitsAfterCategoryMove({
      splits: [
        { category_id: 4, amount: 15 },
        { category_id: 4, amount: 25 },
      ],
      totalAmount: 40,
      fromCategoryId: 4,
      toCategoryId: 9,
    });

    assert.deepEqual(next, [{ category_id: 9, amount: 40 }]);
  });

  it('moves only this category’s amount when the transaction is split', () => {
    const next = splitsAfterCategoryMove({
      splits: [
        { category_id: 4, amount: 40 },
        { category_id: 7, amount: 60 },
      ],
      totalAmount: 100,
      fromCategoryId: 4,
      toCategoryId: 9,
    });

    assert.deepEqual(next, [
      { category_id: 7, amount: 60 },
      { category_id: 9, amount: 40 },
    ]);
  });

  it('combines with an existing split on the destination category', () => {
    const next = splitsAfterCategoryMove({
      splits: [
        { category_id: 4, amount: 10.1 },
        { category_id: 9, amount: 20.2 },
      ],
      totalAmount: 30.3,
      fromCategoryId: 4,
      toCategoryId: 9,
    });

    assert.deepEqual(next, [{ category_id: 9, amount: 30.3 }]);
  });

  it('does nothing when the category does not change', () => {
    const next = splitsAfterCategoryMove({
      splits: [{ category_id: 4, amount: 40 }],
      totalAmount: 40,
      fromCategoryId: 4,
      toCategoryId: 4,
    });

    assert.equal(next, null);
  });

  it('treats an account-only edit as envelope-neutral', () => {
    const splits = [{ category_id: 4, amount: 40 }];
    assert.equal(
      splitsAffectEnvelopesDifferently(splits, splits, 'expense', 'expense'),
      false,
    );
  });

  it('detects a category move as an envelope change', () => {
    assert.equal(
      splitsAffectEnvelopesDifferently(
        [{ category_id: 4, amount: 40 }],
        [{ category_id: 9, amount: 40 }],
        'expense',
        'expense',
      ),
      true,
    );
  });

  it('treats merged splits with the same category total as the same envelope impact', () => {
    const previous = [
      { category_id: 4, amount: 10 },
      { category_id: 4, amount: 30 },
    ];
    const next = [{ category_id: 4, amount: 40 }];
    assert.equal(splitsAffectEnvelopesDifferently(previous, next, 'expense', 'expense'), false);
    assert.equal(splitRowsDiffer(previous, next), true);
  });

  it('detects an income/expense flip even when the splits match', () => {
    const splits = [{ category_id: 4, amount: 40 }];
    assert.equal(
      splitsAffectEnvelopesDifferently(splits, splits, 'expense', 'income'),
      true,
    );
  });

  it('does nothing when this category is not on the transaction', () => {
    const next = splitsAfterCategoryMove({
      splits: [{ category_id: 7, amount: 60 }],
      totalAmount: 60,
      fromCategoryId: 4,
      toCategoryId: 9,
    });

    assert.equal(next, null);
  });
});
