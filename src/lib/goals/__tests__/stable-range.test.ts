import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { nextStableSplitRange, SPLIT_PAGE_SIZE } from '../stable-range';

describe('nextStableSplitRange', () => {
  it('orders by id so range pages do not skip rows', () => {
    const first = nextStableSplitRange(0);
    assert.equal(first.orderColumn, 'id');
    assert.equal(first.ascending, true);
    assert.equal(first.from, 0);
    assert.equal(first.to, SPLIT_PAGE_SIZE - 1);

    const second = nextStableSplitRange(SPLIT_PAGE_SIZE);
    assert.equal(second.from, 1000);
    assert.equal(second.to, 1999);
  });
});
