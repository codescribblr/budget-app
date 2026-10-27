import { describe, expect, it } from "vitest";
import type { ParsedTransaction } from "@/lib/import-types";
import {
  filterReviewItems,
  includeReviewedTransaction,
  reviewBucket,
  reviewValidation,
  separateImportHash,
  validReviewSplits,
} from "../mobile-review";
const transaction = (
  changes: Partial<ParsedTransaction> = {},
): ParsedTransaction => ({
  id: "queued-1",
  date: "2026-10-27",
  merchant: "Neighborhood Market",
  description: "CARD PURCHASE RIVERSIDE REF 001",
  amount: 30,
  transaction_type: "expense",
  originalData: "{}",
  hash: "canonical",
  isDuplicate: false,
  status: "pending",
  splits: [{ categoryId: 1, categoryName: "Groceries", amount: 30 }],
  ...changes,
});
describe("mobile import review eligibility", () => {
  it("keeps attention, ready, and skipped mutually exclusive, including uncategorized exclusions", () => {
    const items = [
      transaction(),
      transaction({ id: "queued-2", status: "excluded", splits: [] }),
      transaction({
        id: "queued-3",
        status: "excluded",
        splits: [],
        reviewSkipped: true,
      }),
      transaction({ id: "queued-4", duplicateType: "within-file" }),
      transaction({ id: "queued-5", isDuplicate: true }),
    ];
    expect(filterReviewItems(items, "ready").map((t) => t.id)).toEqual([
      "queued-1",
    ]);
    expect(filterReviewItems(items, "attention").map((t) => t.id)).toEqual([
      "queued-2",
    ]);
    expect(filterReviewItems(items, "skipped").map((t) => t.id)).toEqual([
      "queued-3",
      "queued-4",
      "queued-5",
    ]);
    expect(filterReviewItems(items, "all")).toHaveLength(5);
  });
  it("searches the full bank description, merchant, and envelope without changing eligibility", () => {
    const items = [
      transaction(),
      transaction({ id: "queued-2", status: "excluded" }),
    ];
    expect(filterReviewItems(items, "ready", " riverside ")).toHaveLength(1);
    expect(filterReviewItems(items, "all", "GROCERIES")).toHaveLength(2);
    expect(filterReviewItems(items, "ready", "missing")).toEqual([]);
  });
  it("requires real dates and complete valid details before a row can enter the import payload", () => {
    for (const changes of [
      { date: "2026-02-30" },
      { date: "" },
      { amount: 0 },
      { amount: NaN },
      { merchant: "  " },
      { description: "" },
      { amount: 30.001 },
    ]) {
      const item = transaction(changes);
      expect(reviewValidation(item)).not.toBeNull();
      expect(reviewBucket(item)).toBe("attention");
    }
    expect(reviewValidation(transaction({ date: "2024-02-29" }))).toBeNull();
  });
  it("accepts cent rounding but rejects missing, zero, unassigned and unbalanced splits", () => {
    const split = (amount: number, categoryId = 1) => ({
      categoryId,
      categoryName: "Groceries",
      amount,
    });
    expect(
      validReviewSplits(
        transaction({ amount: 0.3, splits: [split(0.1), split(0.2, 2)] }),
      ),
    ).toBe(true);
    for (const splits of [
      [],
      [split(0)],
      [split(30, 0)],
      [split(20)],
      [split(30.001)],
      [split(40), split(-10)],
    ]) {
      expect(validReviewSplits(transaction({ splits }))).toBe(false);
    }
  });
  it("restores deliberately skipped rows only when included", () => {
    const skipped = transaction({ reviewSkipped: true, status: "excluded" });
    expect(reviewBucket(skipped)).toBe("skipped");
    expect(reviewBucket(includeReviewedTransaction(skipped))).toBe("ready");
  });
  it("keeps duplicate overrides explicit, preserves bank text, and is stable on retry", () => {
    const duplicate = transaction({
      isDuplicate: true,
      duplicateType: "database",
      status: "excluded",
    });
    expect(reviewBucket(includeReviewedTransaction(duplicate))).toBe("skipped");
    const included = includeReviewedTransaction(duplicate, true);
    expect(reviewBucket(included)).toBe("ready");
    expect(included.description).toBe(duplicate.description);
    expect(included.forceImport).toBe(true);
    expect(included.hash).not.toBe(duplicate.hash);
    expect(separateImportHash(included.hash, included.id)).toBe(included.hash);
    expect(separateImportHash(duplicate.hash, "queued-2")).not.toBe(
      included.hash,
    );
  });
});
