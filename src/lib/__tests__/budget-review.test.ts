import { describe, it, expect } from "vitest";
import {
  parseReportPeriod,
  comparisonPeriod,
  completedReportMonths,
  summarizeBudgetReview,
  type ReportCategory,
  type ReportTransaction,
} from "../budget-review";
const categories: ReportCategory[] = [
  { id: 1, name: "Food", monthly_amount: 600, current_balance: 130 },
  {
    id: 2,
    name: "Transfers",
    monthly_amount: 0,
    current_balance: 0,
    is_system: true,
  },
  {
    id: 3,
    name: "Yearly costs",
    monthly_amount: 100,
    current_balance: 400,
    category_type: "accumulation",
  },
  {
    id: 4,
    name: "Goal",
    monthly_amount: 100,
    current_balance: 400,
    is_goal: true,
  },
];
const row = (
  id: number,
  date: string,
  amount: number,
  splits: { category_id: number; amount: number }[],
  income = false,
): ReportTransaction => ({
  id,
  date,
  total_amount: amount,
  splits,
  transaction_type: income ? "income" : "expense",
  merchant_name: "Shop",
  merchant_group_id: 5,
});
const period = { start: "2026-10-01", end: "2026-10-20" },
  prior = { start: "2026-09-11", end: "2026-09-30" },
  months = ["2026-07", "2026-08", "2026-09"];
describe("budget report periods", () => {
  it("compares equal-length periods without DST drift", () => {
    expect(comparisonPeriod(period)).toEqual({
      start: "2026-09-01",
      end: "2026-09-20",
    });
    expect(
      comparisonPeriod({ start: "2026-03-08", end: "2026-03-14" }),
    ).toEqual({ start: "2026-03-01", end: "2026-03-07" });
  });
  it("compares complete calendar months rather than shifting 31 days", () => {
    expect(
      comparisonPeriod({ start: "2026-03-01", end: "2026-03-31" }),
    ).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });
  it("supports open-ended dates without inventing a comparison", () => {
    expect(parseReportPeriod(new URLSearchParams())).toEqual({
      start: null,
      end: null,
    });
    expect(comparisonPeriod({ start: null, end: "2026-10-20" })).toBeNull();
  });
  it("uses complete calendar months across year boundaries", () => {
    expect(completedReportMonths("2026-01-15")).toEqual([
      "2025-10",
      "2025-11",
      "2025-12",
    ]);
  });
  it.each([
    "startDate=2026-02-30",
    "startDate=2026-10-20&endDate=2026-10-01",
    "endDate=oops",
  ])("rejects invalid periods %s", (query) =>
    expect(() => parseReportPeriod(new URLSearchParams(query))).toThrow(),
  );
});
describe("report meaning and money accuracy", () => {
  it("excludes only system portions of split transactions and separates money in", () => {
    const result = summarizeBudgetReview(
      [
        row(1, "2026-10-12", 120, [
          { category_id: 1, amount: 80 },
          { category_id: 2, amount: 40 },
        ]),
        row(2, "2026-10-13", 15, [{ category_id: 1, amount: 15 }], true),
      ],
      categories,
      period,
      prior,
      months,
    );
    expect(result.totals).toMatchObject({
      expenses: 80,
      incoming: 15,
      excluded: 40,
      count: 2,
    });
    expect(result.categories[0]).toMatchObject({
      id: 1,
      expenses: 80,
      incoming: 15,
      currentBalance: 130,
    });
    expect(result.merchants[0].expenses).toBe(80);
  });
  it("category filters use the matching split for all totals and merchants", () => {
    const result = summarizeBudgetReview(
      [
        row(1, "2026-10-12", 120, [
          { category_id: 1, amount: 80 },
          { category_id: 3, amount: 40 },
        ]),
      ],
      categories,
      period,
      prior,
      months,
      false,
      3,
    );
    expect(result.totals.expenses).toBe(40);
    expect(result.merchants[0].expenses).toBe(40);
    expect(result.categories).toHaveLength(1);
  });
  it("keeps merchant overrides separate from their original merchant group", () => {
    const ordinary = row(1, "2026-10-12", 30, [{ category_id: 1, amount: 30 }]);
    const override = {
      ...row(2, "2026-10-12", 50, [{ category_id: 1, amount: 50 }]),
      merchant_override_id: 7,
      merchant_name: "Override store",
    };
    const result = summarizeBudgetReview(
      [ordinary, override],
      categories,
      period,
      null,
      [],
    );
    expect(result.merchants).toEqual([
      { name: "Override store", expenses: 50, count: 1, groupId: null },
      { name: "Shop", expenses: 30, count: 1, groupId: 5 },
    ]);
  });
  it("counts uncategorized portions and prevents oversummed totals", () => {
    const result = summarizeBudgetReview(
      [row(1, "2026-10-12", 100, [{ category_id: 1, amount: 60 }])],
      categories,
      period,
      null,
      [],
    );
    expect(result.totals.unassigned).toBe(40);
    expect(result.totals.expenses).toBe(100);
    expect(() =>
      summarizeBudgetReview(
        [row(2, "2026-10-12", 50, [{ category_id: 1, amount: 60 }])],
        categories,
        period,
        null,
        [],
      ),
    ).toThrow();
  });
  it("does not count history-only records in the selected period", () => {
    const result = summarizeBudgetReview(
      [
        row(1, "2026-07-12", 300, [{ category_id: 1, amount: 300 }]),
        row(2, "2026-08-12", 600, [{ category_id: 1, amount: 600 }]),
        row(3, "2026-09-12", 900, [{ category_id: 1, amount: 900 }]),
        row(4, "2026-10-12", 40, [{ category_id: 1, amount: 40 }]),
      ],
      categories,
      period,
      prior,
      months,
    );
    expect(result.totals).toMatchObject({
      expenses: 40,
      previousExpenses: 900,
      count: 1,
      previousCount: 1,
    });
    expect(result.plan[0]).toMatchObject({
      averageExpenses: 600,
      monthlyBudget: 600,
      monthsWithSpending: 3,
    });
    expect(result.months.map((m) => m.expenses)).toEqual([300, 600, 900]);
  });
  it("does not suggest monthly spending targets for reserves, yearly costs or goals", () => {
    const result = summarizeBudgetReview(
      [
        row(1, "2026-09-12", 200, [
          { category_id: 3, amount: 100 },
          { category_id: 4, amount: 100 },
        ]),
      ],
      categories,
      period,
      prior,
      months,
    );
    expect(result.plan).toEqual([]);
  });
  it("keeps cent accuracy and does not net refunds against expenses", () => {
    const result = summarizeBudgetReview(
      [
        row(1, "2026-10-12", 0.1, [{ category_id: 1, amount: 0.1 }]),
        row(2, "2026-10-12", 0.2, [{ category_id: 1, amount: 0.2 }]),
        row(3, "2026-10-12", 0.1, [{ category_id: 1, amount: 0.1 }], true),
      ],
      categories,
      period,
      null,
      [],
    );
    expect(result.totals.expenses).toBe(0.3);
    expect(result.totals.incoming).toBe(0.1);
  });
});
