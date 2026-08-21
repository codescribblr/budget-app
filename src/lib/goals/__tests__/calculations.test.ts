import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { envelopeGoalProgressAmount } from '../calculations';

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
