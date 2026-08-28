export type ExistingImportedRecord = {
  id: number;
  hash: string;
  account_id: number;
};

export type ExistingImportLink = {
  imported_transaction_id: number;
};

export type ImportHashResolution = {
  fullyImportedHashes: Set<string>;
  orphanedHashes: Set<string>;
  hashToImportedId: Map<string, number>;
};

/**
 * Decide which import hashes belong to this budget account and whether they
 * already have a transaction link. Records from other accounts are ignored.
 */
export function resolveImportedHashes(
  currentAccountId: number,
  existingImported: ExistingImportedRecord[],
  existingLinks: ExistingImportLink[]
): ImportHashResolution {
  const linkedImportedIds = new Set(
    existingLinks.map((link) => link.imported_transaction_id)
  );
  const fullyImportedHashes = new Set<string>();
  const orphanedHashes = new Set<string>();
  const hashToImportedId = new Map<string, number>();

  for (const record of existingImported) {
    if (record.account_id !== currentAccountId) {
      continue;
    }
    hashToImportedId.set(record.hash, record.id);
    if (linkedImportedIds.has(record.id)) {
      fullyImportedHashes.add(record.hash);
    } else {
      orphanedHashes.add(record.hash);
    }
  }

  return { fullyImportedHashes, orphanedHashes, hashToImportedId };
}

export type RetryTransactionCandidate = {
  id: number;
  date: string;
  description: string;
  total_amount: number;
};

export type RetryTransactionMatch = {
  date: string;
  description: string;
  amount: number;
};

/**
 * Find an unlinked transaction created by a previous import that failed
 * before writing imported_transaction_links.
 */
export function findRetryTransactionMatch(
  candidates: RetryTransactionCandidate[],
  txn: RetryTransactionMatch
): number | null {
  const expectedAmount = Math.abs(Number(txn.amount) || 0);
  const match = candidates.find(
    (candidate) =>
      candidate.date === txn.date &&
      candidate.description === txn.description &&
      Math.abs(Number(candidate.total_amount) - expectedAmount) < 0.01
  );
  return match?.id ?? null;
}

export function assertNoUpdateErrors(
  results: Array<{ error?: { message?: string } | null }>
): void {
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(failed.error.message || 'Failed to update category balances');
  }
}
