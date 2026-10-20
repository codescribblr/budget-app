import { describe, expect, it } from "vitest";
import { goalDraft, prepareGoal, purposeAllowsType } from "../guided-goals";
import {
  calculateGoalStatus,
  goalEnvelopeProgress,
} from "../goals/calculations";
import { validateCreateGoal } from "../goals/validations";
import type { CreateGoalRequest, GoalWithDetails } from "../types";

describe("purpose-specific goal progress", () => {
  it("counts purchases already made, but not as money still available", () => {
    expect(goalEnvelopeProgress(500, 300, "purchase")).toBe(800);
    expect(goalEnvelopeProgress(500, 300, null)).toBe(800);
    expect(goalEnvelopeProgress(200, 300, "purchase")).toBe(500);
  });
  it("reopens a reached emergency reserve after money is used", () => {
    const goal = {
      goal_type: "envelope",
      purpose: "reserve",
      target_amount: 1000,
      status: "completed",
    } as GoalWithDetails;
    expect(goalEnvelopeProgress(750, 250, "reserve")).toBe(750);
    expect(
      calculateGoalStatus(goal, goalEnvelopeProgress(750, 250, "reserve")),
    ).toBe("active");
    expect(goalEnvelopeProgress(-20, 1020, "reserve")).toBe(0);
  });
  it("does not count retirement money until the contribution is recorded", () => {
    expect(goalEnvelopeProgress(500, 0, "retirement")).toBe(0);
    expect(goalEnvelopeProgress(200, 300, "retirement")).toBe(300);
    expect(goalEnvelopeProgress(300, 200, "retirement")).toBe(200); // refunded contribution
    expect(goalEnvelopeProgress(0, -100, "retirement")).toBe(0);
  });
  it("keeps debt progress separate from cash reserved for payments", () => {
    const draft = {
      ...goalDraft(),
      purpose: "debt" as const,
      type: "debt-paydown" as const,
      name: "Card payoff",
      source: "card:9",
      payment: "42",
      target: "8000",
    };
    const payload = prepareGoal(draft) as CreateGoalRequest;
    expect(payload).toMatchObject({
      linked_credit_card_id: 9,
      funding_category_id: 42,
      purpose: "debt",
    });
    expect(payload).not.toHaveProperty("target_amount");
    expect(payload).not.toHaveProperty("linked_category_id");
    expect(validateCreateGoal(payload).valid).toBe(true);
  });
  it("reuses an envelope without inventing a starting balance", () => {
    const payload = prepareGoal({
      ...goalDraft(),
      purpose: "reserve",
      name: "Safety net",
      target: "1000",
      envelope: "42",
    });
    expect(payload).toMatchObject({
      linked_category_id: 42,
      purpose: "reserve",
    });
    expect(payload).not.toHaveProperty("starting_balance");
  });
  it("links retirement value to an investment instead of excluding a cash account", () => {
    const payload = prepareGoal({
      ...goalDraft(),
      purpose: "retirement",
      type: "asset-linked",
      source: "asset:5",
      name: "Retirement",
      target: "500000",
    }) as CreateGoalRequest;
    expect(payload).toMatchObject({
      linked_non_cash_asset_id: 5,
      goal_type: "asset-linked",
    });
    expect(payload).not.toHaveProperty("linked_account_id");
    expect(validateCreateGoal(payload).valid).toBe(true);
  });
  it("preserves an existing goal's purpose, sources, and balance on ordinary edits", () => {
    const goal = {
      id: 1,
      name: "Retirement",
      goal_type: "asset-linked",
      purpose: "retirement",
      target_amount: 500000,
      linked_non_cash_asset_id: 5,
      monthly_contribution: 300,
    } as GoalWithDetails;
    expect(goalDraft(goal).source).toBe("asset:5");
    expect(prepareGoal({ ...goalDraft(goal), monthly: "500" }, goal)).toEqual({
      name: "Retirement",
      monthly_contribution: 500,
      notes: null,
    });
  });
  it("changes only the payment-envelope reference when linking an existing debt goal", () => {
    const debt = {
      id: 1,
      name: "Card payoff",
      goal_type: "debt-paydown",
      target_amount: 8000,
      linked_credit_card_id: 9,
      monthly_contribution: 400,
      funding_category_id: 42,
    } as GoalWithDetails;
    const draft = goalDraft(debt);
    expect(prepareGoal({ ...draft, payment: "43" }, debt)).toEqual({
      name: debt.name,
      monthly_contribution: 400,
      notes: null,
      funding_category_id: 43,
    });
    expect(prepareGoal({ ...draft, payment: "none" }, debt)).toMatchObject({
      funding_category_id: null,
    });
    expect(
      prepareGoal({ ...draft, payment: undefined }, debt),
    ).not.toHaveProperty("funding_category_id");
  });
  it("rejects incompatible purpose/source combinations", () => {
    expect(purposeAllowsType("reserve", "debt-paydown")).toBe(false);
    expect(purposeAllowsType("retirement", "account-linked")).toBe(false);
    expect(
      validateCreateGoal({
        name: "Bad",
        goal_type: "envelope",
        purpose: "debt",
        target_amount: 100,
        monthly_contribution: 0,
      }).valid,
    ).toBe(false);
    expect(
      validateCreateGoal({
        name: "Bad",
        goal_type: "asset-linked",
        target_amount: 100,
        monthly_contribution: 0,
        linked_non_cash_asset_id: 1,
      }).valid,
    ).toBe(false);
  });
  it("rejects malformed source IDs and non-finite money", () => {
    for (const id of [-1, 1.5, Infinity]) {
      expect(
        validateCreateGoal({
          name: "Debt",
          goal_type: "debt-paydown",
          purpose: "debt",
          linked_loan_id: id,
          monthly_contribution: 0,
        }).valid,
      ).toBe(false);
    }
    expect(
      validateCreateGoal({
        name: "Reserve",
        goal_type: "envelope",
        purpose: "reserve",
        target_amount: Infinity,
        monthly_contribution: 0,
      }).valid,
    ).toBe(false);
    expect(() =>
      prepareGoal({
        ...goalDraft(),
        purpose: "reserve",
        name: "Reserve",
        target: "100",
        envelope: "not-an-id",
      }),
    ).toThrow();
  });
});
