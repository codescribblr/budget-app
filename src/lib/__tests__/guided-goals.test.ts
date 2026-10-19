import { describe, expect, it } from "vitest";
import {
  bufferMovePreview,
  goalDraft,
  goalGuidance,
  prepareGoal,
} from "../guided-goals";
import { validateUpdateGoal, validateCreateGoal } from "../goals/validations";
import { interfaceRoute, localDate } from "../new-look";
import type { GoalWithDetails } from "../types";

const goal = {
  id: 1,
  name: "Trip",
  goal_type: "envelope",
  monthly_contribution: 100,
  target_amount: 2000,
  target_date: "2020-01-01",
  current_balance: 400,
  status: "overdue",
  linked_category_id: 2,
} as GoalWithDetails;
describe("guided goal plans", () => {
  it("creates an empty envelope, without inventing money or a source", () => {
    const payload = prepareGoal({
      ...goalDraft(),
      name: " Trip ",
      target: "2000",
      monthly: "125.50",
    });
    expect(payload).toEqual({
      name: "Trip",
      goal_type: "envelope",
      target_amount: 2000,
      monthly_contribution: 125.5,
      target_date: null,
      notes: null,
    });
  });
  it("edits an overdue goal without resubmitting its past date or changing its money", () => {
    const payload = prepareGoal({ ...goalDraft(goal), monthly: "150" }, goal);
    expect(payload).toEqual({
      name: "Trip",
      monthly_contribution: 150,
      notes: null,
    });
    expect(validateUpdateGoal(goal, payload, 400)).toEqual({ valid: true });
  });
  it("can remove a deadline", () =>
    expect(prepareGoal({ ...goalDraft(goal), date: "" }, goal)).toMatchObject({
      target_date: null,
    }));
  it("preserves original debt and linked source when editing", () => {
    const debt = {
      ...goal,
      goal_type: "debt-paydown",
      target_amount: 5000,
      current_balance: 900,
      linked_credit_card_id: 4,
    } as GoalWithDetails;
    const payload = prepareGoal(
      { ...goalDraft(debt), target: "900", source: "card:5", monthly: "200" },
      debt,
    );
    expect(payload).not.toHaveProperty("target_amount");
    expect(payload).not.toHaveProperty("linked_credit_card_id");
  });
  it.each(["1.001", "1e3", "", "-1", "NaN"])(
    "rejects invalid monthly amount %s",
    (monthly) =>
      expect(() =>
        prepareGoal({ ...goalDraft(goal), monthly }, goal),
      ).toThrow(),
  );
  it.each(["2030-02-30", "not-a-date", "2020-02-01"])(
    "rejects invalid or newly changed past deadline %s",
    (date) =>
      expect(() => prepareGoal({ ...goalDraft(goal), date }, goal)).toThrow(),
  );
  it("allows today consistently in the client and API", () => {
    const payload = {
      name: "Trip",
      goal_type: "envelope" as const,
      monthly_contribution: 0,
      target_amount: 100,
      target_date: localDate(),
    };
    expect(validateCreateGoal(payload).valid).toBe(true);
  });
  it("links an existing account without resetting its balance", () => {
    const payload = prepareGoal({
      ...goalDraft(),
      name: "Reserve",
      type: "account-linked",
      target: "5000",
      source: "account:7",
    });
    expect(payload).toMatchObject({ linked_account_id: 7 });
    expect(payload).not.toHaveProperty("new_account_balance");
    expect(payload).not.toHaveProperty("starting_balance");
  });
  it("leaves the debt baseline to the server", () => {
    const payload = prepareGoal({
      ...goalDraft(),
      name: "Car",
      type: "debt-paydown",
      source: "loan:8",
    });
    expect(payload).toMatchObject({ linked_loan_id: 8 });
    expect(payload).not.toHaveProperty("target_amount");
  });
  it("rejects a mismatched source", () =>
    expect(() =>
      prepareGoal({
        ...goalDraft(),
        name: "Car",
        type: "debt-paydown",
        source: "account:8",
      }),
    ).toThrow());
  it("pauses tracking without changing funding", () =>
    expect(
      prepareGoal({ ...goalDraft(goal), paused: true }, goal),
    ).toMatchObject({ status: "paused", monthly_contribution: 100 }));
  it("does not describe an undated goal as on schedule", () =>
    expect(
      goalGuidance({
        ...goal,
        status: "active",
        target_date: null,
        is_on_track: true,
      }),
    ).toBe("At your own pace"));
  it("routes classic buffer and goal details to the new workspace", () => {
    expect(interfaceRoute("/income-buffer", "new")).toBe(
      "/new/goals#income-buffer",
    );
    expect(interfaceRoute("/goals/12", "new")).toBe("/new/goals?goal=12");
  });
});
describe("buffer previews", () => {
  it("reserves only currently available funds", () => {
    expect(bufferMovePreview("add", "10.10", 20.2, 50.3)).toEqual({
      amount: 10.1,
      balance: 30.3,
      available: 40.2,
    });
    expect(() => bufferMovePreview("add", "50.31", 20.2, 50.3)).toThrow();
  });
  it("releases into available funds without implying an allocation", () =>
    expect(bufferMovePreview("release", "20.20", 20.2, -5)).toEqual({
      amount: 20.2,
      balance: 0,
      available: 15.2,
    }));
  it("cannot release more than the buffer", () =>
    expect(() => bufferMovePreview("release", "20.21", 20.2, 500)).toThrow());
});
