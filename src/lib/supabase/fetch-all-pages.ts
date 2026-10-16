/** PostgREST returns at most this many rows unless the query uses range(). */
export const SUPABASE_PAGE_SIZE = 1000;

/**
 * Load every row from a query that would otherwise stop at SUPABASE_PAGE_SIZE.
 * fetchPage must apply a stable order and return range(from, to) inclusive.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const page = await fetchPage(from, from + SUPABASE_PAGE_SIZE - 1);
    if (page.length === 0) break;
    rows.push(...page);
    if (page.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }

  return rows;
}

/** Split a large `.in()` list so each request stays under the row cap. */
export function chunkValues<T>(values: T[], size: number): T[][] {
  if (size < 1) {
    throw new Error('chunk size must be positive');
  }

  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}
