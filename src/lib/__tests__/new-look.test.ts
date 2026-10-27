import { describe, expect, it } from "vitest";
import {
  currentInterfacePath,
  checkinPeriod,
  interfaceRoute,
  parseMoney,
  potentialSurplus,
  suggestAllocation,
  remainingFunding,
  safeReturnPath,
} from "../new-look";
import type { Category } from "../types";

const category = (id: number, overrides: Partial<Category> = {}): Category => ({
  id,
  name: `Envelope ${id}`,
  monthly_amount: 100,
  current_balance: 250,
  sort_order: id,
  is_system: false,
  category_type: "monthly_expense",
  created_at: "",
  updated_at: "",
  ...overrides,
});
describe("interface navigation", () => {
  it("preserves local sign-in destinations including filters and feedback links", () => {
    for (const path of ["/new/accounts?checkin=daily", "/admin/interface-feedback?feedback=example-id", "/new/reports?startDate=2026-10-01&dateRange=custom", "/new#daily"]) {
      expect(safeReturnPath(path)).toBe(path);
    }
  });
  it("rejects external or ambiguous sign-in destinations and honors the interface fallback", () => {
    for (const path of [null, "", "https://example.com", "//example.com", "/\\example.com", "/\n/example.com", "javascript:alert(1)", " /new"]) {
      expect(safeReturnPath(path, "/new")).toBe("/new");
    }
    expect(safeReturnPath(null)).toBe("/dashboard");
  });
  it("maps corresponding tasks in both directions and keeps import review routes", () => {
    expect(interfaceRoute("/accounts", "new")).toBe("/new/accounts");
    expect(interfaceRoute("/credit-cards", "new")).toBe("/new/accounts");
    expect(interfaceRoute("/new/budget", "classic")).toBe("/categories");
    expect(interfaceRoute("/imports/map-columns", "new")).toBe(
      "/new/imports/map-columns",
    );
    expect(interfaceRoute("/new/imports/abc", "classic")).toBe("/imports/abc");
    expect(interfaceRoute("/settings", "new")).toBe("/new/settings");
    for (const section of ["features", "dashboard", "account", "collaborators", "profile", "password", "notifications", "subscription", "automatic-imports", "import-templates", "duplicates", "merchants", "backup", "integrations", "api-keys"]) {
      expect(interfaceRoute(`/settings/${section}`, "new")).toBe(`/new/settings/${section}`);
      expect(interfaceRoute(`/new/settings/${section}`, "classic")).toBe(`/settings/${section}`);
    }
    expect(interfaceRoute("/new/settings", "classic")).toBe("/settings");
  });
});
describe("money entry", () => {
  it("rejects empty, malformed, nonfinite and fractional-cent amounts", () => {
    for (const value of [
      "",
      " ",
      "NaN",
      "Infinity",
      "1e3",
      "12x",
      "0.001",
      "1,200",
      "9999999999",
    ])
      expect(parseMoney(value)).toBeNull();
    expect(parseMoney(" -12.45 ")).toBe(-12.45);
    expect(parseMoney("0")).toBe(0);
    expect(parseMoney("1200.50")).toBe(1200.5);
  });
});
describe("envelope signals", () => {
  it("does not label accumulation, goal, buffer, system, or target balances as surplus", () => {
    expect(potentialSurplus(category(1))).toBe(150);
    for (const override of [
      { category_type: "accumulation" },
      { category_type: "target_balance" },
      { is_goal: true },
      { is_buffer: true },
      { is_system: true },
      { monthly_amount: 0 },
    ]) {
      expect(potentialSurplus(category(1, override as Partial<Category>))).toBe(
        0,
      );
    }
    expect(potentialSurplus(category(1, { current_balance: -20 }))).toBe(0);
  });
});
describe("paycheck suggestions", () => {
  it("tops up target balances without double-subtracting prior funding and leaves goals manual", () => {
    const target = category(1, {
      category_type: "target_balance",
      target_balance: 500,
      current_balance: 490,
      monthly_amount: 0,
    });
    expect(remainingFunding(target, 200)).toBe(10);
    expect(remainingFunding({ ...target, current_balance: 600 }, 0)).toBe(0);
    expect(
      suggestAllocation([target, category(2, { is_goal: true })], [], 100),
    ).toEqual({ 1: "10.00" });
  });
  it("uses funding history, not current balance, and stops at the cent-exact limit", () => {
    const categories = [
      category(1, { priority: 2 }),
      category(2, { priority: 1, current_balance: -50 }),
      category(3, { is_system: true }),
      category(4, { is_archived: true }),
    ];
    const result = suggestAllocation(
      categories,
      [
        {
          categoryId: 2,
          fundedAmount: 99.99,
          targetAmount: 100,
          remainingToFund: 0.01,
        },
      ],
      50.01,
    );
    expect(result).toEqual({ 1: "50.00", 2: "0.01" });
    expect(
      Object.values(result).reduce(
        (sum, v) => sum + Math.round(Number(v) * 100),
        0,
      ),
    ).toBe(5001);
  });
  it("uses current targets, avoids refunding fully funded envelopes, and supports ordinary order without priorities", () => {
    const categories = [
      category(1, { priority: 9 }),
      category(2, { priority: 1 }),
    ];
    expect(suggestAllocation(categories, [], 25, false)).toEqual({
      1: "25.00",
      2: "0.00",
    });
    expect(
      suggestAllocation(
        categories,
        [
          {
            categoryId: 2,
            fundedAmount: 150,
            targetAmount: 200,
            remainingToFund: 50,
          },
        ],
        25,
      ),
    ).toEqual({ 1: "25.00", 2: "0.00" });
    expect(suggestAllocation(categories, [], -10)).toEqual({
      1: "0.00",
      2: "0.00",
    });
  });
});
describe("calendar check-in boundaries", () => {
  it("uses local calendar days, Sunday-start weeks and month keys", () => {
    expect(checkinPeriod("daily", new Date(2026, 9, 14, 23, 59))).toBe(
      "2026-10-14",
    );
    expect(checkinPeriod("weekly", new Date(2026, 9, 18))).toBe("2026-10-18");
    expect(checkinPeriod("weekly", new Date(2026, 9, 19))).toBe("2026-10-18");
    expect(checkinPeriod("monthly", new Date(2026, 9, 31))).toBe("2026-10");
    expect(checkinPeriod("monthly", new Date(2026, 10, 1))).toBe("2026-11");
  });
});

it("switches between the matching envelope detail pages", () => {
  expect(interfaceRoute("/categories/42", "new")).toBe("/new/budget/42");
  expect(interfaceRoute("/new/budget/42", "classic")).toBe("/categories/42");
});

describe("shared workflow destinations", () => {
 it("keeps settings, billing returns, remapping and restored budgets in the active interface", () => {
   for (const [classic,modern] of [["/settings","/new/settings"],["/settings/subscription?success=true","/new/settings/subscription?success=true"],["/settings/subscription?canceled=true","/new/settings/subscription?canceled=true"],["/settings?tab=features","/new/settings?tab=features"],["/imports/map-columns?remap=true&batchId=123","/new/imports/map-columns?remap=true&batchId=123"],["/dashboard","/new"]]) {
     expect(currentInterfacePath(classic,true)).toBe(modern);
     expect(currentInterfacePath(classic,false)).toBe(classic);
   }
 });
 it("leaves unrelated and already-modern destinations alone", () => {
   for(const path of ["/new/settings", "/api/v1/docs", "/login", "/settings-elsewhere", "https://billing.example/settings"]) expect(currentInterfacePath(path,true)).toBe(path);
 });
});
