import type { ParsedTransaction } from "@/lib/import-types";
import {
  canImportTransaction,
  needsCategoryConfirmation,
  reviewPatch,
} from "./categorization";

/** Identical durable decision for an individual choice and final bulk confirmation. */
export function categoryReviewSaveRow(t: ParsedTransaction) {
  return {
    id: Number(t.id.slice(7)),
    revision: t.revision,
    state: t.reviewSkipped ? "skipped" : "reviewed",
    merchant: t.merchant,
    forceImport: !!t.forceImport,
    patch: reviewPatch(t),
  };
}

/** Use the choices/revisions shown when confirmation opened, never a live rebase.
 * Persist every confirmation before importing; failures leave saved reviews resumable.
 */
export async function confirmImportReview<T>(
  snapshot: ParsedTransaction[],
  save: (rows: ParsedTransaction[]) => Promise<ParsedTransaction[]>,
  importRows: (rows: ParsedTransaction[]) => Promise<T>,
): Promise<T> {
  const ready = snapshot.filter(canImportTransaction);
  if (!ready.length) throw new Error("Choose an envelope before importing.");
  const unconfirmed = ready.filter(needsCategoryConfirmation);
  const saved = new Map<string, ParsedTransaction>();
  for (let offset = 0; offset < unconfirmed.length; offset += 100) {
    const chunk = unconfirmed.slice(offset, offset + 100);
    const result = await save(chunk);
    for (const original of chunk) {
      const row = result.find((t) => t.id === original.id);
      if (!row?.revision || row.categoryReview?.state !== "reviewed")
        throw new Error(
          "Could not confirm every choice. Refresh the saved review before importing.",
        );
      saved.set(row.id, row);
    }
  }
  return importRows(ready.map((t) => saved.get(t.id) ?? t));
}
