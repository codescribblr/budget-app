import type {
  Account,
  Category,
  CreditCard,
  CreateCategoryRequest,
  UpdateAccountRequest,
  UpdateCreditCardRequest,
} from "./types";
import { cents, parseMoney } from "./new-look";

export type AccountKind = "account" | "card";
export function setupReturnTarget(
  section: "accounts" | "envelopes",
  from: string | null,
) {
  if (section === "accounts" && from === "daily")
    return {
      href: "/new/accounts?checkin=daily",
      label: "Return to daily check-in →",
    };
  if (section === "envelopes" && from === "monthly")
    return {
      href: "/new/plan?checkin=monthly",
      label: "Return to monthly check-in →",
    };
  if (section === "envelopes" && (from === "daily" || from === "weekly"))
    return {
      href: `/new/budget?checkin=${from}`,
      label: `Return to ${from} check-in →`,
    };
  return section === "accounts"
    ? { href: "/new/accounts", label: "Update balances →" }
    : { href: "/new/budget", label: "Review envelopes →" };
}
export type AccountSelection =
  | { kind: "account"; item: Account | null }
  | { kind: "card"; item: CreditCard | null };
export interface AccountSetupDraft {
  name: string;
  accountType: Account["account_type"];
  balance: string;
  limit: string;
  available: string;
  included: boolean;
}
export function accountBudgetContribution(
  kind: AccountKind,
  balance: number,
  included: boolean,
) {
  if (!included) return 0;
  return kind === "card" ? (balance > 0 ? -balance : 0) : balance;
}
export function prepareAccountSetup(
  selection: AccountSelection,
  draft: AccountSetupDraft,
) {
  const name = draft.name.trim();
  if (!name || name.length > 100)
    throw new Error("Enter an account name of 100 characters or fewer.");
  const common = { name, include_in_totals: draft.included };
  if (selection.kind === "account") {
    const balance = selection.item?.balance ?? parseMoney(draft.balance);
    if (balance === null)
      throw new Error(
        "Enter a valid starting balance with up to two decimal places.",
      );
    if (!["checking", "savings", "cash"].includes(draft.accountType))
      throw new Error("Choose an account type.");
    const payload: UpdateAccountRequest = {
      ...common,
      account_type: draft.accountType,
    };
    // Settings edits must never overwrite a balance refreshed elsewhere.
    if (!selection.item) payload.balance = balance;
    return {
      payload,
      balance,
      contribution: accountBudgetContribution(
        "account",
        balance,
        draft.included,
      ),
    };
  }
  const limit = parseMoney(draft.limit);
  const available = parseMoney(draft.available);
  if (limit === null || limit < 0)
    throw new Error(
      "Enter a credit limit of zero or more, with up to two decimal places.",
    );
  if (available === null)
    throw new Error(
      "Enter available credit exactly as your provider shows it, with up to two decimal places.",
    );
  const balance = (cents(limit) - cents(available)) / 100;
  const payload: UpdateCreditCardRequest = { ...common };
  if (
    !selection.item ||
    limit !== selection.item.credit_limit ||
    available !== selection.item.available_credit
  ) {
    payload.credit_limit = limit;
    payload.available_credit = available;
  }
  return {
    payload,
    balance,
    contribution: accountBudgetContribution("card", balance, draft.included),
  };
}

export type EnvelopePurpose = NonNullable<Category["category_type"]>;
export const envelopePurposes = [
  {
    value: "monthly_expense",
    label: "Spend each month",
    description: "Groceries, rent, and everyday spending.",
  },
  {
    value: "accumulation",
    label: "Save for yearly costs",
    description: "Build up for insurance, gifts, and other irregular expenses.",
  },
  {
    value: "target_balance",
    label: "Build a reserve",
    description: "Work toward a balance you want to keep on hand.",
  },
] as const;
export function envelopePurposeLabel(category: Category) {
  if (category.is_goal) return "Linked to a goal";
  return (
    envelopePurposes.find(
      (p) => p.value === (category.category_type || "monthly_expense"),
    )?.label || "Spend each month"
  );
}
export interface EnvelopeSetupDraft {
  name: string;
  purpose: EnvelopePurpose;
  monthly: string;
  annual: string;
  target: string;
  priority: number;
  notes: string;
}
export function prepareEnvelopeSetup(
  draft: EnvelopeSetupDraft,
  existing: Category | null,
  advanced: boolean,
  priorityEnabled: boolean,
): Partial<CreateCategoryRequest> {
  if (existing?.is_goal || existing?.is_buffer || existing?.is_system)
    throw new Error("This category is managed by its linked tool.");
  const name = draft.name.trim();
  if (!name || name.length > 100)
    throw new Error("Enter an envelope name of 100 characters or fewer.");
  const payload: Partial<CreateCategoryRequest> = {
    name,
    notes: draft.notes.trim(),
  };
  if (draft.notes.length > 5000)
    throw new Error("Keep your notes under 5,000 characters.");
  // A disabled optional feature must not silently convert an existing envelope.
  const canPlan =
    advanced ||
    !existing ||
    !existing.category_type ||
    existing.category_type === "monthly_expense";
  if (canPlan) {
    const purpose = advanced ? draft.purpose : "monthly_expense";
    if (!envelopePurposes.some((p) => p.value === purpose))
      throw new Error("Choose how you want to use this envelope.");
    const amount = parseMoney(
      purpose === "accumulation" ? draft.annual : draft.monthly,
    );
    if (amount === null || amount < 0)
      throw new Error(
        "Enter a funding target of zero or more, with up to two decimal places.",
      );
    payload.category_type = purpose;
    payload.monthly_amount = purpose === "accumulation" ? amount / 12 : amount;
    if (purpose === "accumulation") payload.annual_target = amount;
    if (purpose === "target_balance") {
      const target = parseMoney(draft.target);
      if (target === null || target < 0)
        throw new Error(
          "Enter a balance target of zero or more, with up to two decimal places.",
        );
      payload.target_balance = target;
    }
  }
  if (priorityEnabled) {
    if (
      !Number.isInteger(draft.priority) ||
      draft.priority < 1 ||
      draft.priority > 10
    )
      throw new Error("Choose a priority from 1 to 10.");
    payload.priority = draft.priority;
  }
  // Planning does not move money. New envelopes use the API's zero balance default.
  return payload;
}

export function envelopeArchiveBlock(category: Category) {
  if (category.is_goal || category.is_buffer || category.is_system)
    return "Manage this category through its linked tool.";
  if (!category.is_archived && cents(category.current_balance) !== 0)
    return "Bring this envelope’s balance to $0 before archiving it, so no money or overspending is hidden.";
  return null;
}
