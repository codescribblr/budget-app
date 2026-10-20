import type { Category } from "@/lib/types";
import { cents, money, potentialSurplus } from "@/lib/new-look";

export type EnvelopeProgress = ReturnType<typeof envelopeProgress>;

/** Spending limits, cash reserves, and contributions answer different questions. */
export function envelopeProgress(
  category: Category,
  spent: number,
  funded: number,
) {
  const balance = cents(category.current_balance) / 100;
  const spending = cents(spent) / 100;
  const funding = cents(funded) / 100;
  const plan = cents(category.monthly_amount) / 100;
  const kind =
    category.is_goal || category.category_type === "accumulation"
      ? "funding"
      : category.category_type === "target_balance"
        ? "reserve"
        : "spending";
  const target =
    kind === "reserve" ? cents(category.target_balance ?? 0) / 100 : plan;
  const amount =
    kind === "spending" ? spending : kind === "reserve" ? balance : funding;
  const difference = (cents(target) - cents(amount)) / 100;
  const percent =
    target > 0 ? Math.max(0, Math.min(100, (amount / target) * 100)) : null;
  const overPlan = kind === "spending" && cents(spending) > cents(plan);
  const negative = balance < 0;
  const surplus = potentialSurplus(category);

  let detail: string;
  if (target <= 0) {
    detail =
      kind === "reserve" ? "No balance target set" : "No monthly plan set";
  } else if (kind === "spending") {
    detail =
      difference < 0
        ? `${money(-difference)} over plan`
        : difference === 0
          ? "Monthly plan used"
          : `${money(difference)} left in plan`;
  } else if (kind === "reserve") {
    detail =
      difference > 0
        ? `${money(difference)} below target`
        : "Balance target reached";
  } else {
    detail =
      difference > 0
        ? `${money(difference)} still to fund`
        : "Monthly funding complete";
  }

  return {
    kind,
    amount,
    target,
    percent,
    detail,
    negative,
    overPlan,
    surplus,
    label:
      kind === "spending"
        ? spending < 0
          ? "Net refunds this month"
          : "Spent this month"
        : kind === "reserve"
          ? "Balance target"
          : "Funded this month",
    typeLabel: category.is_goal
      ? "Goal envelope"
      : kind === "reserve"
        ? "Reserve"
        : kind === "funding"
          ? "Yearly & irregular expenses"
          : "Monthly spending",
    // A lack of funding is not overspending, and using savings is not going over a monthly limit.
    tone: negative ? "danger" : overPlan ? "warning" : "normal",
    attention: negative ? 0 : overPlan ? 1 : surplus > 0 ? 2 : 3,
    balanceNote: negative
      ? `${money(-balance)} to cover`
      : surplus > 0
        ? `${money(surplus)} potential surplus`
        : null,
    secondary:
      kind === "spending"
        ? `${money(funding)} funded this month`
        : kind === "reserve"
          ? `${money(funding)} funded · ${money(Math.abs(spending))} ${spending < 0 ? "net refunds" : "spent"} this month · ${money(plan)}/month plan`
          : `${money(Math.abs(spending))} ${spending < 0 ? "net refunds" : "spent"} this month${!category.is_goal ? ` · ${money(category.annual_target ?? plan * 12)} annual plan` : ""}`,
  };
}
