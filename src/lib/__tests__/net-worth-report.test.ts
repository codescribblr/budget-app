import { describe, expect, it } from "vitest";
import { computeNetWorthBreakdown } from "../net-worth";
import {
  worthItems,
  worthPeriod,
  type WorthSnapshot,
} from "../net-worth-report";
import { interfaceRoute } from "../new-look";
const current = {
  totalAccounts: 10000,
  totalAssets: 20000,
  totalCreditCards: 2000,
  totalLoans: 8000,
  netWorth: 20000,
};
const snapshot = (
  date: string,
  overrides: Partial<WorthSnapshot> = {},
): WorthSnapshot => ({
  snapshot_date: date,
  total_accounts: 8000,
  total_assets: 18000,
  total_credit_cards: 3000,
  total_loans: 9000,
  net_worth: 14000,
  ...overrides,
});
describe("net worth review", () => {
  it("uses the actual baseline date and all four drivers reconcile to the total change", () => {
    const result = worthPeriod(
      [snapshot("2026-09-25"), snapshot("2026-10-10")],
      current,
      "2026-10-28",
      "1m",
    );
    expect(result.baseline?.snapshot_date).toBe("2026-09-25");
    expect(result.change).toBe(6000);
    expect(result.drivers.map((d) => d.impact)).toEqual([
      2000, 2000, 1000, 1000,
    ]);
    expect(result.drivers.reduce((sum, d) => sum + d.impact, 0)).toBe(
      result.change,
    );
  });
  it("falls back to shorter available history and does not invent the first day of a period", () => {
    expect(
      worthPeriod(
        [snapshot("2026-10-10")],
        current,
        "2026-10-28",
        "1y",
      ).points.map((p) => p.date),
    ).toEqual(["2026-10-10", "2026-10-28"]);
  });
  it("uses live balances for today, excludes future records, and sorts unordered history", () => {
    const result = worthPeriod(
      [
        snapshot("2026-10-29"),
        snapshot("2026-10-28"),
        snapshot("2026-10-20"),
        snapshot("2026-10-01"),
      ],
      current,
      "2026-10-28",
      "all",
    );
    expect(result.points).toEqual([
      { date: "2026-10-01", value: 14000, current: false },
      { date: "2026-10-20", value: 14000, current: false },
      { date: "2026-10-28", value: 20000, current: true },
    ]);
  });
  it("does not claim a trend from no history or only a snapshot today", () => {
    for (const history of [[], [snapshot("2026-10-28")]]) {
      const result = worthPeriod(history, current, "2026-10-28", "all");
      expect(result.baseline).toBeNull();
      expect(result.change).toBeNull();
      expect(result.drivers).toEqual([]);
    }
  });
  it("handles a negative net worth and increases in debt without misleading percentages", () => {
    const result = worthPeriod(
      [snapshot("2026-09-28")],
      { ...current, totalLoans: 40000, netWorth: -12000 },
      "2026-10-28",
      "1m",
    );
    expect(result.change).toBe(-26000);
    expect(result.drivers[3].impact).toBe(-31000);
  });
  it("uses calendar month arithmetic across leap years", () => {
    expect(
      worthPeriod(
        [snapshot("2024-02-29"), snapshot("2024-03-01")],
        current,
        "2024-03-31",
        "1m",
      ).baseline?.snapshot_date,
    ).toBe("2024-02-29");
  });
  it("keeps the breakdown aligned with the existing total and exposes excluded records separately", () => {
    const base = { id: 1, name: "Example", updated_at: "2026-10-28" };
    const accounts = [
      { ...base, balance: 1000, include_in_totals: true },
      { ...base, id: 2, balance: 9000, include_in_totals: false },
    ];
    const cards = [
      {
        ...base,
        current_balance: 200,
        credit_limit: 1000,
        available_credit: 800,
      },
    ];
    const loans = [
      { ...base, balance: 500, include_in_net_worth: true },
      { ...base, id: 2, balance: 7000, include_in_net_worth: false },
    ];
    const assets = [{ ...base, current_value: 2000 }];
    const rows = worthItems(accounts, cards, loans, assets);
    expect(rows.filter((r) => !r.included)).toHaveLength(2);
    const sum = rows
      .filter((r) => r.included)
      .reduce(
        (n, r) =>
          n + r.value * (r.group === "cards" || r.group === "loans" ? -1 : 1),
        0,
      );
    expect(sum).toBe(
      computeNetWorthBreakdown(accounts, cards, loans, assets).netWorth,
    );
  });
  it("does not show negative zero when debt is unchanged", () => {
    const result = worthPeriod(
      [snapshot("2026-09-28", { total_credit_cards: 2000, total_loans: 8000 })],
      current,
      "2026-10-28",
      "1m",
    );
    expect(Object.is(result.drivers[2].impact, -0)).toBe(false);
    expect(Object.is(result.drivers[3].impact, -0)).toBe(false);
  });
  it("preserves the net worth destination when switching interfaces", () => {
    expect(interfaceRoute("/new/reports/net-worth", "classic")).toBe(
      "/net-worth",
    );
    expect(interfaceRoute("/net-worth", "new")).toBe("/new/reports/net-worth");
  });
});
