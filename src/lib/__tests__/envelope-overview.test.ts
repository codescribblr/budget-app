import { describe, expect, it } from "vitest";
import type { Category } from "@/lib/types";
import { envelopeOverview } from "@/lib/envelope-overview";

const category: Category = {
  id: 1,
  name: "Groceries",
  monthly_amount: 600,
  current_balance: 180,
  sort_order: 0,
  is_system: false,
  created_at: "",
  updated_at: "",
};

describe("balance-first envelope overview", () => {
  it("shows money left, monthly budget, and funding as independent numbers", () => {
    expect(envelopeOverview(category, 300)).toMatchObject({
      balance: 180,
      budget: 600,
      funding: 300,
      percent: 30,
      meterCaption: "30% of $600.00 monthly budget",
    });
    expect(envelopeOverview(category, 600)).toMatchObject({
      balance: 180,
      percent: 30,
      meterCaption: "30% of $600.00 monthly budget",
      funding: 600,
    });
  });
  it("shows a negative balance as the exact amount to cover", () => {
    expect(
      envelopeOverview({ ...category, current_balance: -72.75 }, 600),
    ).toMatchObject({
      percent: null,
      meterCaption: null,
      negative: true,
      balanceNote: "$72.75 needs covering",
      attention: 0,
    });
  });
  it("retains carryover or adjusted cash above the monthly budget", () => {
    expect(
      envelopeOverview({ ...category, current_balance: 850 }, 0),
    ).toMatchObject({
      balance: 850,
      funding: 0,
      percent: 100,
      surplus: 250,
      meterCaption: "141.7% of $600.00 monthly budget",
      balanceNote: "$250.00 above monthly budget",
    });
  });
  it("makes an empty, fully funded envelope visibly empty", () => {
    expect(
      envelopeOverview({ ...category, current_balance: 0 }, 600),
    ).toMatchObject({
      balance: 0,
      percent: 0,
      funding: 600,
      meterCaption: "0% of $600.00 monthly budget",
      balanceNote: "No money in this envelope",
      attention: 1,
    });
  });
  it("does not invent a bar for an envelope without a budget", () => {
    expect(
      envelopeOverview({ ...category, monthly_amount: 0 }, 0),
    ).toMatchObject({
      percent: null,
      meterCaption: null,
      balance: 180,
    });
  });
  it("compares reserves to their balance target, without treating them as spare cash", () => {
    expect(
      envelopeOverview(
        { ...category, category_type: "target_balance", target_balance: 1000 },
        100,
      ),
    ).toMatchObject({
      reference: 1000,
      percent: 18,
      meterCaption: "18% of $1,000.00 balance target",
      surplus: 0,
    });
    expect(
      envelopeOverview(
        {
          ...category,
          category_type: "target_balance",
          target_balance: 1000,
          current_balance: 1200,
        },
        0,
      ),
    ).toMatchObject({
      percent: 100,
      surplus: 0,
      balanceNote: null,
      meterCaption: "120% of $1,000.00 balance target",
    });
  });
  it("compares yearly expense cash to the annual amount while keeping the monthly budget visible", () => {
    expect(
      envelopeOverview(
        {
          ...category,
          category_type: "accumulation",
          monthly_amount: 150,
          annual_target: 1800,
          current_balance: 1200,
        },
        75,
      ),
    ).toMatchObject({
      reference: 1800,
      referenceLabel: "Yearly budget",
      meterCaption: "66.7% of $1,800.00 yearly budget",
      balance: 1200,
      budget: 150,
      funding: 75,
      surplus: 0,
    });
  });
  it("does not turn a goal's monthly contribution into its overall savings target", () => {
    expect(
      envelopeOverview(
        { ...category, is_goal: true, current_balance: 2000 },
        300,
      ),
    ).toMatchObject({
      kind: "goal",
      balance: 2000,
      percent: null,
      meterCaption: null,
      surplus: 0,
      budget: 600,
      funding: 300,
    });
  });
  it("rounds currency before comparing it with the budget", () => {
    expect(
      envelopeOverview(
        { ...category, monthly_amount: 0.3, current_balance: 0.1 + 0.2 },
        0.1 + 0.2,
      ),
    ).toMatchObject({
      balance: 0.3,
      percent: 100,
      surplus: 0,
      funding: 0.3,
    });
  });
});
