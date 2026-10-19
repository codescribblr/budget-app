import type {
  CreateGoalRequest,
  GoalWithDetails,
  UpdateGoalRequest,
} from "./types";
import { cents, localDate, parseMoney } from "./new-look";

export interface GoalDraft {
  name: string;
  type: CreateGoalRequest["goal_type"];
  target: string;
  monthly: string;
  date: string;
  source: string;
  notes: string;
  paused: boolean;
}

export function goalDraft(goal?: GoalWithDetails): GoalDraft {
  return {
    name: goal?.name ?? "",
    type: goal?.goal_type ?? "envelope",
    target: goal ? String(goal.target_amount) : "",
    monthly: goal ? String(goal.monthly_contribution) : "0",
    date: goal?.target_date ?? "",
    source: goal?.linked_account_id
      ? `account:${goal.linked_account_id}`
      : goal?.linked_credit_card_id
        ? `card:${goal.linked_credit_card_id}`
        : goal?.linked_loan_id
          ? `loan:${goal.linked_loan_id}`
          : "",
    notes: goal?.notes ?? "",
    paused: goal?.status === "paused",
  };
}

/** Editing a plan must never reset its balances, original debt, or linked source. */
export function prepareGoal(
  draft: GoalDraft,
  goal?: GoalWithDetails,
): CreateGoalRequest | UpdateGoalRequest {
  const name = draft.name.trim();
  if (!name || name.length > 255)
    throw new Error("Enter a goal name of 255 characters or fewer.");
  const monthly = parseMoney(draft.monthly);
  if (monthly === null || monthly < 0)
    throw new Error(
      "Enter a monthly amount of zero or more, with at most two decimal places.",
    );
  const type = goal?.goal_type ?? draft.type;
  const target = type === "debt-paydown" ? undefined : parseMoney(draft.target);
  if (
    type !== "debt-paydown" &&
    (target === null || target === undefined || target <= 0)
  )
    throw new Error(
      "Enter a target greater than zero, with at most two decimal places.",
    );
  const dateChanged = draft.date !== (goal?.target_date ?? "");
  if (draft.date && (!goal || dateChanged)) {
    const parsed = new Date(`${draft.date}T12:00:00`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(draft.date) ||
      !Number.isFinite(parsed.getTime()) ||
      localDate(parsed) !== draft.date ||
      draft.date < localDate()
    )
      throw new Error(
        "Choose today or a future target date, or leave it blank.",
      );
  }
  const common = {
    name,
    monthly_contribution: monthly,
    notes: draft.notes.trim() || null,
  };
  if (goal)
    return {
      ...common,
      ...(type !== "debt-paydown" && target !== goal.target_amount
        ? { target_amount: target! }
        : {}),
      ...(dateChanged ? { target_date: draft.date || null } : {}),
      ...(draft.paused !== (goal.status === "paused")
        ? { status: draft.paused ? "paused" : "active" }
        : {}),
    };
  const payload: CreateGoalRequest = {
    ...common,
    goal_type: type,
    target_date: draft.date || null,
  };
  if (type === "envelope") return { ...payload, target_amount: target! }; // Start empty; fund explicitly afterward.
  const match = /^(account|card|loan):(\d+)$/.exec(draft.source);
  if (
    !match ||
    !Number.isSafeInteger(Number(match[2])) ||
    Number(match[2]) <= 0
  )
    throw new Error("Choose the account, card, or loan to track.");
  const id = Number(match[2]);
  if (type === "account-linked" && match[1] === "account")
    return { ...payload, target_amount: target!, linked_account_id: id };
  if (type === "debt-paydown" && match[1] === "card")
    return { ...payload, linked_credit_card_id: id };
  if (type === "debt-paydown" && match[1] === "loan")
    return { ...payload, linked_loan_id: id };
  throw new Error("Choose a source that matches this kind of goal.");
}

export function goalGuidance(goal: GoalWithDetails) {
  if (goal.status === "paused") return "Tracking paused";
  if (goal.status === "completed") return "Target reached";
  if (goal.status === "overdue") return "Revisit the target date";
  if (!goal.target_date) return "At your own pace";
  return goal.is_on_track
    ? "Plan fits the target date"
    : "Monthly plan needs a look";
}

export function bufferMovePreview(
  direction: "add" | "release",
  amountText: string,
  balance: number,
  available: number,
) {
  const amount = parseMoney(amountText);
  if (amount === null || amount <= 0)
    throw new Error(
      "Enter an amount greater than zero, with at most two decimal places.",
    );
  const limit = direction === "add" ? available : balance;
  if (cents(amount) > cents(limit))
    throw new Error(
      direction === "add"
        ? "This is more than your available to save."
        : "This is more than your buffer holds.",
    );
  const change = direction === "add" ? cents(amount) : -cents(amount);
  return {
    amount,
    balance: (cents(balance) + change) / 100,
    available: (cents(available) - change) / 100,
  };
}
