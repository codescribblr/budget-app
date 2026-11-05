import { describe, expect, it } from "vitest";
import type { ParsedTransaction } from "@/lib/import-types";
import { initialReviewFilter, reviewViewIds } from "../review-view";
import { reviewPatch } from "../categorization";

const tx = (
  id: string,
  changes: Partial<ParsedTransaction> = {},
): ParsedTransaction => ({
  id,
  date: "2026-10-27",
  merchant: "Market",
  description: "Purchase",
  amount: 20,
  transaction_type: "expense",
  hash: id,
  originalData: "{}",
  status: "pending",
  isDuplicate: false,
  splits: [],
  ...changes,
});
const ready = (t: ParsedTransaction): ParsedTransaction => {
  const next = {
    ...t,
    splits: t.splits.length
      ? t.splits
      : [{ categoryId: 1, categoryName: "Groceries", amount: 20 }],
  };
  return {
    ...next,
    categoryReview: {
      state: "reviewed",
      patch: reviewPatch(next),
      merchant: next.merchant,
      forceImport: false,
    },
  };
};

describe("stable import review workspace", () => {
  it("shows unconfirmed suggestions alongside missing envelopes on first review", () => {
    const suggested = tx("suggested", {
      splits: [{ categoryId: 1, categoryName: "Groceries", amount: 20 }],
    });
    const missing = tx("missing");
    const confirmed = ready(tx("confirmed"));
    const rows = [suggested, missing, confirmed, tx("duplicate", { isDuplicate: true })];
    expect(initialReviewFilter(rows)).toBe("attention");
    expect(initialReviewFilter([suggested])).toBe("attention");
    expect(reviewViewIds(rows, "attention", "")).toEqual(["suggested", "missing"]);
    expect(reviewViewIds(rows, "ready", "")).toEqual(["confirmed"]);
    expect(reviewViewIds([suggested], "attention", "")).toEqual(["suggested"]);
  });
  it("opens a populated tab for already reviewed, duplicate-only, or skipped batches", () => {
    const duplicate = tx("duplicate", { isDuplicate: true });
    const skipped = tx("skipped", { reviewSkipped: true });
    expect(initialReviewFilter([duplicate, ready(tx("confirmed"))])).toBe("ready");
    expect(initialReviewFilter([duplicate, skipped])).toBe("duplicates");
    expect(initialReviewFilter([skipped])).toBe("skipped");
    expect(initialReviewFilter([])).toBe("attention");
  });
  it("keeps completed rows in place, including when every row is ready", () => {
    const rows = [tx("1"), tx("2"), tx("3")];
    const ids = reviewViewIds(rows, "attention", "");
    expect(
      reviewViewIds([ready(rows[0]), rows[1], rows[2]], "attention", "", ids),
    ).toEqual(ids);
    expect(reviewViewIds(rows.map(ready), "attention", "", ids)).toEqual(ids);
  });
  it("preserves order during refresh and appends new matching rows", () => {
    const first = tx("1");
    const second = tx("2");
    const ids = reviewViewIds([first, second], "attention", "");
    expect(
      reviewViewIds([tx("3"), second, ready(first)], "attention", "", ids),
    ).toEqual(["1", "2", "3"]);
  });
  it("retains a result after changing the envelope that matched its search", () => {
    const original = {
      ...tx("1"),
      splits: [{ categoryId: 1, categoryName: "Groceries", amount: 20 }],
    };
    const ids = reviewViewIds([ready(original)], "ready", "groceries");
    const changed = {
      ...ready(original),
      splits: [{ categoryId: 2, categoryName: "Dining out", amount: 20 }],
    };
    expect(reviewViewIds([changed], "ready", "groceries", ids)).toEqual(["1"]);
    expect(reviewViewIds([changed], "ready", "groceries")).toEqual([]);
  });
  it("reapplies filters when explicitly chosen again", () => {
    const rows = [ready(tx("1")), tx("2"), tx("3", { isDuplicate: true })];
    expect(reviewViewIds(rows, "attention", "")).toEqual(["2"]);
    expect(reviewViewIds(rows, "ready", "")).toEqual(["1"]);
    expect(reviewViewIds(rows, "duplicates", "")).toEqual(["3"]);
  });
  it("removes genuinely deleted/imported records but retains skipped and undone rows", () => {
    const ids = ["1", "2", "3"];
    const rows = [tx("2", { reviewSkipped: true }), tx("3")];
    expect(reviewViewIds(rows, "attention", "", ids)).toEqual(["2", "3"]);
    expect(reviewViewIds(rows, "ready", "", ids)).toEqual(["2", "3"]);
  });
});
