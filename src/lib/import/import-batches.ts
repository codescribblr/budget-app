export interface ImportBatchResult {
  imported: number;
  skipped?: number;
  requested?: number;
  skippedItems?: { description: string; reason: string }[];
  errors?: string[];
}

/** Keep each HTTP request within the host's timeout/drain window. Never retry
 * an uncertain write automatically; successful earlier chunks stay committed. */
export async function importInBatches<T>(
  rows: T[],
  send: (chunk: T[]) => Promise<ImportBatchResult>,
  progress?: (result: ImportBatchResult) => void,
): Promise<Required<ImportBatchResult>> {
  const total: Required<ImportBatchResult> = { imported: 0, skipped: 0, requested: rows.length, skippedItems: [], errors: [] };
  for (let offset = 0; offset < rows.length; offset += 50) {
    const chunk = rows.slice(offset, offset + 50);
    let result: ImportBatchResult;
    try {
      result = await send(chunk);
      if (!Number.isSafeInteger(result.imported) || result.imported < 0 ||
          !Number.isSafeInteger(result.skipped ?? 0) || (result.skipped ?? 0) < 0 ||
          result.imported + (result.skipped ?? 0) > chunk.length) throw Error('The import returned an invalid completion count.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The request did not complete.';
      throw Error(`${total.imported} of ${rows.length} imports confirmed. ${message} Reload the review to check the remaining rows before retrying.`);
    }
    total.imported += result.imported;
    total.skipped += result.skipped ?? 0;
    total.skippedItems.push(...(result.skippedItems ?? []));
    total.errors.push(...(result.errors ?? []));
    progress?.({ ...total });
    if (result.errors?.length || result.imported + (result.skipped ?? 0) < chunk.length) {
      if (!total.errors.length) total.errors.push('Some rows did not complete. Reload the review before retrying.');
      break;
    }
  }
  return total;
}
