import type { Category } from "@/lib/types";
import { cents, money, potentialSurplus } from "@/lib/new-look";

export type EnvelopeOverview = ReturnType<typeof envelopeOverview>;

/** Lead with recorded cash. Funding is a separate allocation history, not cash remaining. */
export function envelopeOverview(category: Category, funded: number) {
  const balance = cents(category.current_balance) / 100;
  const budget = cents(category.monthly_amount) / 100;
  const funding = cents(funded) / 100;
  const kind = category.is_goal
    ? "goal"
    : category.category_type === "target_balance"
      ? "reserve"
      : category.category_type === "accumulation"
        ? "yearly"
        : "monthly";
  // Goal completion may count purchases, contributions, or debt payments.
  // Never pretend its monthly contribution is the goal's savings target.
  const reference =
    kind === "goal"
      ? 0
      : kind === "reserve"
        ? cents(category.target_balance ?? 0) / 100
        : kind === "yearly"
          ? cents(category.annual_target ?? budget * 12) / 100
          : budget;
  const referenceLabel =
    kind === "reserve"
      ? "Balance target"
      : kind === "yearly"
        ? "Yearly budget"
        : "Monthly budget";
  const percent =
    reference > 0
      ? Math.max(0, Math.min(100, (balance / reference) * 100))
      : null;
  const negative = balance < 0;
  const surplus = potentialSurplus(category);
  const balanceNote = negative
    ? `${money(-balance)} needs covering`
    : surplus > 0
      ? `${money(surplus)} above monthly budget`
      : balance === 0
        ? "No money in this envelope"
        : null;

  return {
    balance,
    budget,
    funding,
    kind,
    reference,
    referenceLabel,
    percent,
    negative,
    surplus,
    balanceNote,
    typeLabel:
      kind === "goal"
        ? "Goal savings"
        : kind === "reserve"
          ? "Reserve"
          : kind === "yearly"
            ? "Yearly & irregular expenses"
            : "Everyday spending",
    attention: negative
      ? 0
      : kind === "monthly" && balance === 0
        ? 1
        : surplus > 0
          ? 2
          : 3,
  };
}
