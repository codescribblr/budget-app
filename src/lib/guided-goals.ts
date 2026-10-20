import type {
  CreateGoalRequest,
  GoalWithDetails,
  UpdateGoalRequest,
  GoalPurpose,
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
  purpose?: GoalPurpose | null;
  envelope?: string;
  payment?: string;
}

export function goalDraft(goal?: GoalWithDetails): GoalDraft {
  return {
    name: goal?.name ?? "",
    type: goal?.goal_type ?? "envelope",
    target: goal ? String(goal.target_amount) : "",
    monthly: goal ? String(goal.monthly_contribution) : "0",
    date: goal?.target_date ?? "",
    source: goal?.linked_non_cash_asset_id
      ? `asset:${goal.linked_non_cash_asset_id}`
      : goal?.linked_account_id
        ? `account:${goal.linked_account_id}`
        : goal?.linked_credit_card_id
          ? `card:${goal.linked_credit_card_id}`
          : goal?.linked_loan_id
            ? `loan:${goal.linked_loan_id}`
            : "",
    notes: goal?.notes ?? "",
    paused: goal?.status === "paused",
    purpose: goal?.purpose,
    envelope: goal?.linked_category_id
      ? String(goal.linked_category_id)
      : "new",
    payment: goal?.funding_category_id
      ? String(goal.funding_category_id)
      : "none",
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
      ...(type === "debt-paydown" &&
      draft.payment !== undefined &&
      draft.payment !==
        (goal.funding_category_id ? String(goal.funding_category_id) : "none")
        ? {
            funding_category_id:
              !draft.payment || draft.payment === "none"
                ? null
                : goalSourceId(draft.payment),
          }
        : {}),
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
    ...(draft.purpose ? { purpose: draft.purpose } : {}),
  };
  if (draft.purpose && !purposeAllowsType(draft.purpose, type))
    throw new Error("Choose a tracking method that fits this goal.");
  if (type === "debt-paydown" && draft.payment && draft.payment !== "none") {
    if (draft.payment === "new") payload.create_funding_envelope = true;
    else payload.funding_category_id = goalSourceId(draft.payment);
  }
  if (type === "envelope")
    return {
      ...payload,
      target_amount: target!,
      ...(draft.envelope && draft.envelope !== "new"
        ? { linked_category_id: goalSourceId(draft.envelope) }
        : {}),
    };
  const match = /^(account|card|loan|asset):(\d+)$/.exec(draft.source);
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
  if (type === "asset-linked" && match[1] === "asset")
    return { ...payload, target_amount: target!, linked_non_cash_asset_id: id };
  throw new Error("Choose a source that matches this kind of goal.");
}

function goalSourceId(value: string) {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))
    throw new Error("Choose an available envelope.");
  return Number(value);
}

export const goalPurposes = [
  {
    value: "debt",
    title: "Pay down debt",
    detail:
      "Watch a card or loan balance fall, with a clear plan for payments.",
  },
  {
    value: "purchase",
    title: "Save for a purchase or event",
    detail:
      "A car, a trip, a wedding. Count money saved and purchases already made.",
  },
  {
    value: "reserve",
    title: "Build a safety reserve",
    detail: "Keep money ready for surprises. Refill it after you use it.",
  },
  {
    value: "retirement",
    title: "Save for retirement",
    detail:
      "Track contributions from your budget or an investment’s current value.",
  },
] as const;

export function purposeAllowsType(
  purpose: GoalPurpose,
  type: CreateGoalRequest["goal_type"],
) {
  if (purpose === "debt") return type === "debt-paydown";
  if (purpose === "retirement")
    return type === "envelope" || type === "asset-linked";
  return (
    (purpose === "purchase" || purpose === "reserve") &&
    (type === "envelope" || type === "account-linked")
  );
}

export function goalProgressLabel(
  goal: Pick<GoalWithDetails, "goal_type" | "purpose">,
) {
  if (goal.goal_type === "debt-paydown") return "Debt remaining";
  if (goal.goal_type === "asset-linked") return "Recorded investment value";
  if (goal.purpose === "retirement") return "Contributions recorded";
  if (goal.purpose === "reserve") return "Reserve available";
  return "Progress toward your target";
}

/** Used both before creation and during review; setup and daily use tell the same story. */
export function goalWorkflow(
  goal: Pick<
    GoalWithDetails,
    | "goal_type"
    | "purpose"
    | "linked_credit_card"
    | "funding_category_id"
    | "linked_account"
  >,
) {
  if (goal.goal_type === "debt-paydown") {
    const included = goal.linked_credit_card?.include_in_totals;
    return [
      included
        ? "The card’s full amount owed already reduces Available to save. A payment envelope is an additional reserve, not extra debt paid off."
        : goal.funding_category_id
          ? "Allocate real money to the payment envelope when it is available. Money waiting there does not reduce your debt."
          : "Choose how much cash you can use for a payment. This goal’s monthly amount is a pace estimate; it does not reserve money.",
      "Make payments at your bank or lender whenever you are ready. This app does not send or schedule payments.",
      included
        ? "Update both the paying account and available credit after a payment. Exclude the card-payment transfer from imports when the purchases are already categorized. If you earmarked money in an extra payment envelope, release that earmark after paying; do not also record it as spending."
        : goal.linked_credit_card
          ? "Update the paying account and available credit after paying. While this card is excluded from totals, budget its outgoing payments once, rather than also categorizing its purchases. Categorizing purchases without deducting card debt can overstate Available to save; review the card’s inclusion in Accounts if you use it for everyday spending."
          : "Update the paying account and loan balance after paying. Import the outgoing payment once and categorize it to the envelope you use for loan payments.",
      "Progress is the reduction from starting debt to today’s amount owed. Interest and new borrowing can move it backward; money set aside is shown separately.",
    ];
  }
  if (goal.goal_type === "asset-linked")
    return [
      "Make contributions through your employer or investment provider. This goal does not move money or reserve an envelope.",
      "Keep payroll deductions in your income plan so they are excluded from take-home pay. Don’t fund those deductions again from your budget.",
      "Update the investment value in Assets when you review your statement. Progress includes contributions, withdrawals, gains and losses; it is not a contribution total.",
    ];
  if (goal.goal_type === "account-linked")
    return [
      goal.linked_account?.include_in_totals
        ? "This account is currently included in budget totals, so tracking it as a goal does not reserve its money. Review its inclusion in Accounts if it should be dedicated to this goal."
        : "This entire account is dedicated to this goal and excluded from Available to save. No envelope is created.",
      "Move money at your bank when you want to save, then update both recorded account balances. Do not also allocate that money to an envelope.",
      "Progress follows the current account balance. Withdrawals reduce progress, even when they pay for the goal.",
    ];
  if (goal.purpose === "retirement")
    return [
      "Allocate take-home money to this envelope when you get paid. Reserved money is shown separately and does not count as a completed contribution.",
      "Send the contribution to your retirement provider, then import the outgoing payment once as spending in this envelope. Refunds reduce the contribution total.",
      "Only contributions categorized to this envelope count toward the target. Use a dedicated envelope for this goal’s period. Payroll deductions already removed from take-home pay belong in the income plan instead.",
    ];
  if (goal.purpose === "reserve")
    return [
      "Allocate available money to this envelope when you get paid. It stays in your bank but is reserved in your budget.",
      "When you need the reserve, categorize the expense here or move money to the envelope covering it.",
      "Only money still in the envelope counts. Spending or moving money out reduces progress and brings a reached goal back into progress, so you can refill it.",
    ];
  return [
    "Allocate available money to this envelope when you get paid. Creating the goal does not add money.",
    "Categorize purchases for this goal to the envelope when you import transactions.",
    "Progress is money still reserved plus net spending categorized here, including earlier transactions in an existing envelope. Moving money elsewhere reduces progress.",
  ];
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
