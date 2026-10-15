import { describe, expect, it } from "vitest";
import { merchantReportTransactionIds } from "../report-filters";

describe("merchant report system-category filter", () => {
  const categories = [{ id: 1, is_system: false }, { id: 2, is_system: true }];
  const transactions = [
    { id: 10, splits: [{ id: 1, transaction_id: 10, category_id: 1, amount: 25 }] },
    { id: 11, splits: [{ id: 2, transaction_id: 11, category_id: 2, amount: 1000 }] },
    { id: 12, splits: [{ id: 3, transaction_id: 12, category_id: 1, amount: 25 }, { id: 4, transaction_id: 12, category_id: 2, amount: 975 }] },
    { id: 13, splits: [] },
  ].map(t => ({ ...t, splits: t.splits.map(s => ({ ...s, created_at: "", category_name: "Test category" })) }));
  it("excludes system and mixed-system transactions before grouped totals are requested", () => {
    expect(merchantReportTransactionIds(transactions, categories, false)).toEqual([10, 13]);
  });
  it("includes all selected transactions when system categories are requested", () => {
    expect(merchantReportTransactionIds(transactions, categories, true)).toEqual([10, 11, 12, 13]);
  });
});
