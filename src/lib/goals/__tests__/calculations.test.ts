import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildEnvelopeGoalBreakdown, envelopeGoalProgressAmount } from '../calculations';

describe('envelopeGoalProgressAmount', () => {
  it('counts leftover only when nothing has been spent', () => {
    assert.equal(envelopeGoalProgressAmount(1000, 0), 1000);
  });

  it('keeps progress after a goal payment leaves the envelope', () => {
    // Fund 1000, pay 100 deposit: 900 left + 100 spent
    assert.equal(envelopeGoalProgressAmount(900, 100), 1000);
  });

  it('drops progress when money is transferred out', () => {
    // After the deposit, move 500 to an emergency envelope
    assert.equal(envelopeGoalProgressAmount(400, 100), 500);
  });

  it('counts an unfunded payment still categorized to the goal', () => {
    assert.equal(envelopeGoalProgressAmount(-1000, 1000), 1000);
  });

  it('matches leftover plus lifetime spending (Jackson case)', () => {
    assert.equal(envelopeGoalProgressAmount(1000, 6000), 7000);
  });

  it('lets a categorized refund reduce progress', () => {
    assert.equal(envelopeGoalProgressAmount(1000, -50), 950);
  });

  it('does not go below zero', () => {
    assert.equal(envelopeGoalProgressAmount(0, -25), 0);
  });

  it('treats missing values as zero', () => {
    assert.equal(envelopeGoalProgressAmount(Number.NaN, Number.NaN), 0);
  });
});

describe('buildEnvelopeGoalBreakdown', () => {
  it('lists payments in date order, then leftover', () => {
    const breakdown = buildEnvelopeGoalBreakdown(1000, [
      {
        date: '2026-08-13',
        description: 'Capital One $3000',
        amount: 3000,
        transaction_id: 2,
        transaction_type: 'expense',
      },
      {
        date: '2026-06-18',
        description: 'Capital One $2000',
        amount: 2000,
        transaction_id: 1,
        transaction_type: 'expense',
      },
    ]);

    assert.equal(breakdown.leftover, 1000);
    assert.equal(breakdown.categorized_spending, 5000);
    assert.equal(breakdown.total, 6000);
    assert.equal(breakdown.items[0]?.description, 'Capital One $2000');
    assert.equal(breakdown.items[1]?.description, 'Capital One $3000');
    assert.equal(breakdown.items[2]?.kind, 'leftover');
    assert.equal(breakdown.items[2]?.amount, 1000);
  });

  it('omits leftover when the envelope is empty', () => {
    const breakdown = buildEnvelopeGoalBreakdown(0, [
      {
        date: '2026-06-18',
        description: 'Capital One',
        amount: 2000,
        transaction_id: 1,
        transaction_type: 'expense',
      },
    ]);

    assert.equal(breakdown.items.length, 1);
    assert.equal(breakdown.items[0]?.kind, 'transaction');
    assert.equal(breakdown.total, 2000);
  });
});
