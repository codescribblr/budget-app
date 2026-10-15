import { describe, expect, it } from "vitest";
import {
  incomeMultiplier,
  incomeSummary,
  validateIncomeSource,
} from "../income-planning";
import { calculateStreamMonthlyNet } from "../income-calculations";
import { interfaceRoute } from "../new-look";
import type { IncomeStream, PayFrequency } from "../types";

const source = (overrides: Partial<IncomeStream> = {}): IncomeStream => ({
  id: 1,
  account_id: 1,
  name: "Main job",
  annual_income: 78000,
  tax_rate: 0.2,
  pay_frequency: "bi-weekly",
  include_extra_paychecks: true,
  pre_tax_deduction_items: [],
  include_in_budget: true,
  sort_order: 0,
  created_at: "",
  updated_at: "",
  ...overrides,
});

describe("income planning entry", () => {
  it.each<[PayFrequency, number]>([
    ["weekly", 52],
    ["bi-weekly", 26],
    ["semi-monthly", 24],
    ["monthly", 12],
    ["quarterly", 4],
    ["annually", 1],
  ])("annualizes paycheck entry for %s", (schedule, count) => {
    expect(3000 * incomeMultiplier("paycheck", schedule)).toBe(3000 * count);
    expect(incomeMultiplier("month", schedule)).toBe(12);
    expect(incomeMultiplier("year", schedule)).toBe(1);
  });
  it("uses the existing monthly calculation and excludes sources kept outside the plan", () => {
    const job = source({
      pre_tax_deduction_items: [
        { id: "retirement", name: "Retirement", type: "percentage", value: 10 },
        { id: "health", name: "Health", type: "fixed", value: 100 },
      ],
    });
    const summary = incomeSummary([
      job,
      source({ id: 2, include_in_budget: false, annual_income: 120000 }),
    ]);
    expect(summary.gross).toBe(6500);
    expect(summary.deductions).toBeCloseTo(650 + 2600 / 12);
    expect(summary.net).toBe(calculateStreamMonthlyNet(job));
    expect(summary.gross - summary.deductions - summary.taxes).toBeCloseTo(
      summary.net,
    );
  });
  it("preserves the existing two-paycheck planning calculation", () => {
    const job = source({ include_extra_paychecks: false });
    expect(incomeSummary([job])).toEqual({
      gross: 6000,
      net: 4700,
      deductions: 0,
      taxes: 1300,
    });
  });
  it("has a zero estimate when all sources are excluded", () => {
    expect(incomeSummary([source({ include_in_budget: false })])).toEqual({
      gross: 0,
      net: 0,
      deductions: 0,
      taxes: 0,
    });
  });
  it("validates names, amounts, rates and deductions without silently coercing bad input to zero", () => {
    expect(validateIncomeSource(source())).toBeNull();
    for (const changes of [
      { name: " " },
      { annual_income: NaN },
      { annual_income: -1 },
      { annual_income: Infinity },
      { tax_rate: NaN },
      { tax_rate: 1.01 },
      { tax_rate: -0.01 },
    ]) {
      expect(validateIncomeSource(source(changes))).not.toBeNull();
    }
    for (const deduction of [
      { name: "", type: "fixed" as const, value: 10 },
      { name: "Health", type: "fixed" as const, value: NaN },
      { name: "Retirement", type: "percentage" as const, value: 101 },
      { name: "Health", type: "fixed" as const, value: 3001 },
    ]) {
      expect(
        validateIncomeSource(
          source({ pre_tax_deduction_items: [{ id: "test", ...deduction }] }),
        ),
      ).not.toBeNull();
    }
    expect(
      validateIncomeSource(
        source({
          pre_tax_deduction_items: [
            { id: "a", name: "A", type: "percentage", value: 60 },
            { id: "b", name: "B", type: "percentage", value: 50 },
          ],
        }),
      ),
    ).not.toBeNull();
    expect(
      validateIncomeSource(source({ annual_income: 0, tax_rate: 0 })),
    ).toBeNull();
  });
  it("switches between the matching income pages", () => {
    expect(interfaceRoute("/income", "new")).toBe("/new/income");
    expect(interfaceRoute("/new/income", "classic")).toBe("/income");
  });
});
