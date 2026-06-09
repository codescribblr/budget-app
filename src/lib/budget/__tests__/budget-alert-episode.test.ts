import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldSendBudgetAlert } from '../budget-alert-episode';

describe('shouldSendBudgetAlert', () => {
  it('sends when there is no prior episode', () => {
    assert.equal(shouldSendBudgetAlert(undefined, new Date('2026-06-15')), true);
  });

  it('sends when episode was cleared', () => {
    assert.equal(
      shouldSendBudgetAlert({ active: false, lastNotifiedAt: '2026-06-01T12:00:00Z', lastNotifiedMonth: '2026-06' }, new Date('2026-06-15')),
      true
    );
  });

  it('does not send again in the same month while episode is active', () => {
    assert.equal(
      shouldSendBudgetAlert(
        { active: true, lastNotifiedAt: '2026-06-09T12:00:00Z', lastNotifiedMonth: '2026-06' },
        new Date('2026-06-20')
      ),
      false
    );
  });

  it('does not send on July 1 if last alert was June 30 (under 5 day gap)', () => {
    assert.equal(
      shouldSendBudgetAlert(
        { active: true, lastNotifiedAt: '2026-06-30T12:00:00Z', lastNotifiedMonth: '2026-06' },
        new Date('2026-07-01T12:00:00Z')
      ),
      false
    );
  });

  it('sends in a new month after at least MIN_DAYS since last alert', () => {
    const lastNotified = new Date('2026-06-20T12:00:00Z');
    const now = new Date('2026-07-01T12:00:00Z');

    assert.equal(
      shouldSendBudgetAlert(
        { active: true, lastNotifiedAt: lastNotified.toISOString(), lastNotifiedMonth: '2026-06' },
        now
      ),
      true
    );
  });

  it('does not send in a new month if fewer than MIN_DAYS since last alert', () => {
    assert.equal(
      shouldSendBudgetAlert(
        { active: true, lastNotifiedAt: '2026-06-30T12:00:00Z', lastNotifiedMonth: '2026-06' },
        new Date('2026-07-02T12:00:00Z')
      ),
      false
    );
  });
});
