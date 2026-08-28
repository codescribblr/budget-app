import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertNoUpdateErrors,
  findRetryTransactionMatch,
  resolveImportedHashes,
} from '../import-hash-resolution';

describe('resolveImportedHashes', () => {
  it('skips hashes already linked on this budget account', () => {
    const result = resolveImportedHashes(
      10,
      [
        { id: 1, hash: 'abc', account_id: 10 },
        { id: 2, hash: 'def', account_id: 10 },
      ],
      [{ imported_transaction_id: 1 }]
    );

    assert.equal(result.fullyImportedHashes.has('abc'), true);
    assert.equal(result.fullyImportedHashes.has('def'), false);
    assert.equal(result.orphanedHashes.has('def'), true);
    assert.equal(result.hashToImportedId.get('abc'), 1);
    assert.equal(result.hashToImportedId.get('def'), 2);
  });

  it('ignores hashes imported under a different budget account', () => {
    const result = resolveImportedHashes(
      10,
      [{ id: 1, hash: 'abc', account_id: 99 }],
      [{ imported_transaction_id: 1 }]
    );

    assert.equal(result.fullyImportedHashes.has('abc'), false);
    assert.equal(result.orphanedHashes.has('abc'), false);
    assert.equal(result.hashToImportedId.has('abc'), false);
  });

  it('does not reuse an orphaned row from another account', () => {
    const result = resolveImportedHashes(
      10,
      [{ id: 7, hash: 'same-csv-row', account_id: 3 }],
      []
    );

    assert.equal(result.hashToImportedId.has('same-csv-row'), false);
    assert.equal(result.orphanedHashes.has('same-csv-row'), false);
  });
});

describe('findRetryTransactionMatch', () => {
  const candidates = [
    { id: 50, date: '2026-08-01', description: 'Kroger', total_amount: 42.15 },
    { id: 51, date: '2026-08-01', description: 'Target', total_amount: 12 },
  ];

  it('reuses the existing transaction when date, description, and amount match', () => {
    const match = findRetryTransactionMatch(candidates, {
      date: '2026-08-01',
      description: 'Kroger',
      amount: 42.15,
    });
    assert.equal(match, 50);
  });

  it('matches when the import amount is signed', () => {
    const match = findRetryTransactionMatch(candidates, {
      date: '2026-08-01',
      description: 'Kroger',
      amount: -42.15,
    });
    assert.equal(match, 50);
  });

  it('returns null when nothing matches', () => {
    const match = findRetryTransactionMatch(candidates, {
      date: '2026-08-01',
      description: 'Kroger',
      amount: 99,
    });
    assert.equal(match, null);
  });
});

describe('assertNoUpdateErrors', () => {
  it('throws when any category balance update failed', () => {
    assert.throws(
      () =>
        assertNoUpdateErrors([
          { error: null },
          { error: { message: 'row locked' } },
        ]),
      /row locked/
    );
  });

  it('passes when every update succeeded', () => {
    assert.doesNotThrow(() => assertNoUpdateErrors([{ error: null }, {}]));
  });
});
