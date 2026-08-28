export const SPLIT_PAGE_SIZE = 1000;

export type StableRange = {
  orderColumn: 'id';
  ascending: true;
  from: number;
  to: number;
};

/**
 * PostgREST .range() is only stable when the query is ordered.
 * Without an order clause, later pages can skip or repeat rows.
 */
export function nextStableSplitRange(
  from: number,
  pageSize: number = SPLIT_PAGE_SIZE
): StableRange {
  return {
    orderColumn: 'id',
    ascending: true,
    from,
    to: from + pageSize - 1,
  };
}
