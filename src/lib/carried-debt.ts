import type { CreditCard } from "./types";
import { cents, localDate, parseMoney } from "./new-look";

/** Deliberately never falls back to current or statement balances. */
export function carriedDebtTotal(
  cards: Pick<CreditCard, "carried_debt_balance">[],
) {
  return (
    cards.reduce(
      (sum, card) => sum + cents(card.carried_debt_balance ?? 0),
      0,
    ) / 100
  );
}
export function carriedDebtPatch(
  amount: string,
  date: string,
  mode: "none" | "carried" | "unknown",
) {
  if (mode === "unknown")
    return { carried_debt_balance: null, carried_debt_as_of: null };
  const value = mode === "none" ? 0 : parseMoney(amount);
  if (value === null || value < 0 || value > 99999999.99)
    throw new Error(
      "Enter the remaining carried balance, using no more than two decimal places.",
    );
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(new Date(`${date}T12:00:00Z`).getTime()) ||
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date ||
    date > localDate()
  )
    throw new Error("Choose a review date no later than today.");
  return { carried_debt_balance: value, carried_debt_as_of: date };
}
