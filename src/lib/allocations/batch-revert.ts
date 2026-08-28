export type BatchUpdateResult = {
  error?: unknown | null;
};

/**
 * When any parallel allocation update fails, revert the ones that succeeded
 * so money is not left in envelopes after the request reports failure.
 */
export function successfulUpdateIndexes(
  results: BatchUpdateResult[]
): number[] {
  const anyFailed = results.some((result) => result.error);
  if (!anyFailed) {
    return [];
  }
  return results
    .map((result, index) => (result.error ? -1 : index))
    .filter((index) => index >= 0);
}
