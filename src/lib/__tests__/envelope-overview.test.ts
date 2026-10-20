import { describe, expect, it } from "vitest";
import type { Category } from "@/lib/types";
import { envelopeProgress } from "@/lib/envelope-overview";

const category: Category = {
  id: 1,
  name: "Groceries",
  monthly_amount: 600,
  current_balance: 300,
  sort_order: 0,
  is_system: false,
  created_at: "",
  updated_at: "",
};

describe("envelope overview", () => {
  it("keeps spending progress independent of funding, carryover, and adjustments", () => {
    const result = envelopeProgress(category, 450, 100);
    expect(result).toMatchObject({
      kind: "spending",
      amount: 450,
      target: 600,
      percent: 75,
      detail: "$150.00 left in plan",
      overPlan: false,
    });
    expect(
      envelopeProgress({ ...category, current_balance: 900 }, 450, 600).percent,
    ).toBe(75);
  });
  it("distinguishes going over the plan from an actual cash shortfall", () => {
    expect(envelopeProgress(category, 750, 600)).toMatchObject({
      percent: 100,
      overPlan: true,
      negative: false,
      tone: "warning",
      detail: "$150.00 over plan",
    });
    expect(
      envelopeProgress({ ...category, current_balance: -25 }, 20, 0),
    ).toMatchObject({
      negative: true,
      overPlan: false,
      tone: "danger",
      balanceNote: "$25.00 to cover",
      attention: 0,
    });
  });
  it("does not invent a percentage when there is no plan", () => {
    expect(
      envelopeProgress({ ...category, monthly_amount: 0 }, 25, 0),
    ).toMatchObject({
      percent: null,
      overPlan: true,
      detail: "No monthly plan set",
    });
    expect(
      envelopeProgress({ ...category, monthly_amount: 0 }, 0, 0).overPlan,
    ).toBe(false);
  });
  it("keeps refunds visible without drawing a negative progress bar", () => {
    expect(envelopeProgress(category, -50, 0)).toMatchObject({
      amount: -50,
      percent: 0,
      detail: "$650.00 left in plan",
      label: "Net refunds this month",
    });
  });
  it("does not label a fully used plan as overspending", () => {
    expect(envelopeProgress(category, 600, 600)).toMatchObject({
      percent: 100,
      overPlan: false,
      detail: "Monthly plan used",
      tone: "normal",
    });
  });
  it("shows cash against a reserve target, not spending against its monthly contribution", () => {
    expect(
      envelopeProgress(
        { ...category, category_type: "target_balance", target_balance: 1000 },
        800,
        100,
      ),
    ).toMatchObject({
      kind: "reserve",
      amount: 300,
      target: 1000,
      percent: 30,
      overPlan: false,
      surplus: 0,
    });
  });
  it("does not imply negative or targetless reserves are complete", () => {
    expect(
      envelopeProgress(
        {
          ...category,
          category_type: "target_balance",
          target_balance: 1000,
          current_balance: -20,
        },
        0,
        100,
      ),
    ).toMatchObject({
      percent: 0,
      negative: true,
      detail: "$1,020.00 below target",
    });
    expect(
      envelopeProgress(
        { ...category, category_type: "target_balance", target_balance: 0 },
        0,
        100,
      ),
    ).toMatchObject({ percent: null, detail: "No balance target set" });
  });
  it("shows this month's contributions for yearly expenses and goal envelopes", () => {
    for (const settings of [
      { category_type: "accumulation" as const },
      { is_goal: true },
    ]) {
      expect(
        envelopeProgress({ ...category, ...settings }, 1500, 300),
      ).toMatchObject({
        kind: "funding",
        amount: 300,
        percent: 50,
        detail: "$300.00 still to fund",
        overPlan: false,
        surplus: 0,
      });
    }
  });
  it("only suggests surplus for ordinary monthly spending envelopes", () => {
    expect(
      envelopeProgress({ ...category, current_balance: 1000 }, 0, 0),
    ).toMatchObject({
      surplus: 400,
      balanceNote: "$400.00 potential surplus",
      attention: 2,
    });
  });
  it("compares currency in cents rather than floating point fragments", () => {
    expect(
      envelopeProgress({ ...category, monthly_amount: 0.3 }, 0.1 + 0.2, 0),
    ).toMatchObject({
      overPlan: false,
      detail: "Monthly plan used",
      percent: 100,
    });
  });
});
