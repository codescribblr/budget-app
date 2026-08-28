import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { successfulUpdateIndexes } from '../batch-revert';

describe('successfulUpdateIndexes', () => {
  it('returns nothing when every update succeeded', () => {
    assert.deepEqual(
      successfulUpdateIndexes([{ error: null }, { error: null }]),
      []
    );
  });

  it('returns indexes that succeeded when a later update fails', () => {
    assert.deepEqual(
      successfulUpdateIndexes([
        { error: null },
        { error: { message: 'failed' } },
        { error: null },
      ]),
      [0, 2]
    );
  });

  it('returns nothing when the first update fails and the rest never ran', () => {
    assert.deepEqual(successfulUpdateIndexes([{ error: { message: 'failed' } }]), []);
  });
});
