import type { ParsedTransaction } from "@/lib/import-types";
import {
  categorizationBucket,
  type CategoryReviewBucket,
} from "./categorization";

/** Open the next useful review step, including a batch containing only duplicates. */
export function initialReviewFilter(transactions: ParsedTransaction[]): CategoryReviewBucket {
  const buckets = new Set(transactions.map(categorizationBucket));
  return (["attention", "ready", "duplicates", "skipped"] as const)
    .find((bucket) => buckets.has(bucket)) ?? "attention";
}

/** Keep the review workspace in place until the user explicitly changes its filter/search.
 * Existing IDs retain their order even when their category/status changes remotely.
 * Deleted/imported rows disappear; new matching rows append without moving existing rows.
 */
export function reviewViewIds(
  transactions: ParsedTransaction[],
  filter: CategoryReviewBucket,
  search: string,
  previousIds: string[] = [],
): string[] {
  const existing = new Set(transactions.map((t) => t.id));
  const ids = previousIds.filter((id) => existing.has(id));
  const included = new Set(ids);
  const query = search.trim().toLowerCase();
  for (const t of transactions) {
    if (included.has(t.id)) continue;
    if (filter !== "all" && categorizationBucket(t) !== filter) continue;
    if (
      ![t.merchant, t.description, ...t.splits.map((s) => s.categoryName)]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
      continue;
    ids.push(t.id);
    included.add(t.id);
  }
  return ids;
}
