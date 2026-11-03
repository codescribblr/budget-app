import type { ParsedTransaction } from "@/lib/import-types";
import {
  categorizationBucket,
  type CategoryReviewBucket,
} from "./categorization";

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
