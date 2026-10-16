import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chunkValues, fetchAllPages, SUPABASE_PAGE_SIZE } from '../fetch-all-pages';

describe('fetchAllPages', () => {
  it('returns a short page without requesting another', async () => {
    const calls: Array<[number, number]> = [];
    const rows = await fetchAllPages(async (from, to) => {
      calls.push([from, to]);
      return ['a', 'b'];
    });

    assert.deepEqual(rows, ['a', 'b']);
    assert.deepEqual(calls, [[0, SUPABASE_PAGE_SIZE - 1]]);
  });

  it('continues after a full page so rows past the default cap are included', async () => {
    const calls: Array<[number, number]> = [];
    const rows = await fetchAllPages(async (from, to) => {
      calls.push([from, to]);
      if (from === 0) {
        return Array.from({ length: SUPABASE_PAGE_SIZE }, (_, index) => index);
      }
      return [SUPABASE_PAGE_SIZE, SUPABASE_PAGE_SIZE + 1];
    });

    assert.equal(rows.length, SUPABASE_PAGE_SIZE + 2);
    assert.equal(rows[0], 0);
    assert.equal(rows.at(-1), SUPABASE_PAGE_SIZE + 1);
    assert.deepEqual(calls, [
      [0, SUPABASE_PAGE_SIZE - 1],
      [SUPABASE_PAGE_SIZE, SUPABASE_PAGE_SIZE * 2 - 1],
    ]);
  });

  it('stops when the page after an exact full page is empty', async () => {
    let calls = 0;
    const rows = await fetchAllPages(async (from) => {
      calls += 1;
      if (from === 0) return Array.from({ length: SUPABASE_PAGE_SIZE }, (_, index) => index);
      return [];
    });

    assert.equal(rows.length, SUPABASE_PAGE_SIZE);
    assert.equal(calls, 2);
  });
});

describe('chunkValues', () => {
  it('splits values into bounded groups', () => {
    assert.deepEqual(chunkValues([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  });

  it('returns no chunks for an empty list', () => {
    assert.deepEqual(chunkValues([], 500), []);
  });
});
