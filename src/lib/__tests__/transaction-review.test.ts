import { describe, expect, it } from "vitest";
import {
  parseReviewFilters,
  summarizeReviewRows,
  matchedTransactionAmount,
  reviewDatePreset,
} from "../transaction-review";
import type { TransactionWithSplits } from "../types";

describe("transaction review filters", () => {
  it("retains multiple envelopes, mixed account types and all selected tags", () => {
    expect(
      parseReviewFilters(
        new URLSearchParams(
          "categoryId=1,2,1&accountId=account-3,card-4&tags=5,6&transactionType=income&sort=added&page=2&pageSize=25",
        ),
      ),
    ).toMatchObject({
      categories: [1, 2],
      accounts: [3],
      cards: [4],
      tags: [5, 6],
      types: ["income"],
      sort: "added",
      page: 2,
      pageSize: 25,
    });
  });
  it.each([
    "categoryId=0",
    "categoryId=1x",
    "accountId=card-NaN",
    "accountId=account-1),foo",
    "page=-1",
    "pageSize=99999",
    "sort=unknown",
    "transactionType=transfer",
    "attention=none",
    "startDate=2026-02-30",
    "startDate=2026-10-20&endDate=2026-10-01",
  ])("rejects invalid filters: %s", (search) => {
    expect(() => parseReviewFilters(new URLSearchParams(search))).toThrow();
  });
  it("uses inclusive local calendar dates for the last seven days and previous year boundaries", () => {
    const now = new Date(2026, 0, 3, 14);
    expect(reviewDatePreset("week", now)).toEqual({
      start: "2025-12-28",
      end: "2026-01-03",
    });
    expect(reviewDatePreset("last-month", now)).toEqual({
      start: "2025-12-01",
      end: "2025-12-31",
    });
    expect(reviewDatePreset("quarter", now)).toEqual({
      start: "2025-10-01",
      end: "2025-12-31",
    });
    expect(reviewDatePreset("all", now)).toEqual({ start: null, end: null });
  });
});
describe("recorded money totals", () => {
  it("keeps expenses and income separate, with exact cent totals", () => {
    expect(
      summarizeReviewRows(
        [
          { total_amount: 0.1, transaction_type: "expense" },
          { total_amount: 0.2, transaction_type: null },
          { total_amount: 30, transaction_type: "income" },
        ],
        false,
      ),
    ).toEqual({ count: 3, expenses: 0.3, income: 30, categoryAmounts: false });
  });
  it("counts only matching envelope splits without double-counting a transaction", () => {
    expect(
      summarizeReviewRows(
        [
          {
            total_amount: 100,
            transaction_type: "expense",
            category_filter: [{ amount: 15 }, { amount: 20 }],
          },
          {
            total_amount: 10,
            transaction_type: "income",
            category_filter: [{ amount: 4 }],
          },
        ],
        true,
      ),
    ).toEqual({ count: 2, expenses: 35, income: 4, categoryAmounts: true });
    const transaction = {
      total_amount: 100,
      splits: [
        { category_id: 1, amount: 15 },
        { category_id: 2, amount: 20 },
        { category_id: 3, amount: 65 },
      ],
    } as TransactionWithSplits;
    expect(matchedTransactionAmount(transaction, [1, 2])).toBe(35);
    expect(matchedTransactionAmount(transaction, [])).toBe(100);
  });
  it("fails on invalid amounts rather than showing partial or corrupted totals", () => {
    expect(() =>
      summarizeReviewRows(
        [{ total_amount: "not a number", transaction_type: "expense" }],
        false,
      ),
    ).toThrow();
    expect(() =>
      summarizeReviewRows(
        [{ total_amount: -1, transaction_type: "expense" }],
        false,
      ),
    ).toThrow();
  });
});
