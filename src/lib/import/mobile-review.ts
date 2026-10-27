import type { ParsedTransaction } from "@/lib/import-types";

export type ReviewFilter = "attention" | "ready" | "skipped" | "all";
export function isReviewDuplicate(item: ParsedTransaction) {
  return !!item.isDuplicate || !!item.duplicateType;
}
export function validReviewSplits(item: ParsedTransaction) {
  return (
    item.splits.length > 0 &&
    item.splits.every(
      (s) =>
        Number.isSafeInteger(s.categoryId) &&
        s.categoryId > 0 &&
        Number.isFinite(s.amount) &&
        s.amount > 0 &&
        Math.abs(s.amount * 100 - Math.round(s.amount * 100)) < 0.00001,
    ) &&
    Math.round(item.splits.reduce((sum, s) => sum + s.amount, 0) * 100) ===
      Math.round(item.amount * 100)
  );
}
export function reviewBucket(
  item: ParsedTransaction,
): Exclude<ReviewFilter, "all"> {
  if (isReviewDuplicate(item) || item.reviewSkipped) return "skipped";
  if (reviewValidation(item)) return "attention";
  return item.status === "excluded" ? "skipped" : "ready";
}
export function filterReviewItems(
  items: ParsedTransaction[],
  filter: ReviewFilter,
  search = "",
) {
  const query = search.trim().toLocaleLowerCase();
  return items.filter(
    (item) =>
      (filter === "all" || reviewBucket(item) === filter) &&
      (!query ||
        [
          item.merchant,
          item.description,
          item.date,
          String(item.amount),
          ...item.splits.map((s) => s.categoryName),
        ].some((text) => text.toLocaleLowerCase().includes(query))),
  );
}
/** The queue ID makes an intentional duplicate override stable across retries. */
export function separateImportHash(hash: string, transactionId: string) {
  const suffix = `:separate:${transactionId}`;
  return hash.endsWith(suffix) ? hash : `${hash}${suffix}`;
}
export function includeReviewedTransaction(
  item: ParsedTransaction,
  separate = false,
): ParsedTransaction {
  return {
    ...item,
    status: "pending",
    reviewSkipped: false,
    ...(separate
      ? {
          isDuplicate: false,
          duplicateType: null,
          forceImport: true,
          hash: separateImportHash(item.hash, item.id),
        }
      : {}),
  };
}
export function reviewValidation(item: ParsedTransaction) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
    !Number.isFinite(Date.parse(`${item.date}T12:00:00Z`)) ||
    new Date(`${item.date}T12:00:00Z`).toISOString().slice(0, 10) !== item.date
  )
    return "Choose a valid transaction date.";
  if (
    !Number.isFinite(item.amount) ||
    item.amount <= 0 ||
    Math.abs(item.amount * 100 - Math.round(item.amount * 100)) > 0.00001
  )
    return "Enter an amount greater than zero, with no more than two decimal places.";
  if (!item.merchant.trim() || !item.description.trim())
    return "Add a merchant and description.";
  if (!validReviewSplits(item))
    return "Choose an envelope for each split. Split amounts must add up to the transaction total.";
  return null;
}

export function formatReviewDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : value;
}
