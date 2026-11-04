import type { Account, Category, PendingCheck } from "./types";
import { getCreditCardBalanceOwed, type CreditCardOwedFields } from "./credit-card-balance";

/** Match budget_available_money using integer cents for every monetary sum.
 * Buffer and archived envelopes still reserve money; excluded accounts/cards
 * and non-buffer system envelopes do not contribute to Available to save. */
export function calculateBudgetTotals({ accounts, categories, creditCards, pendingChecks }: {
  accounts: Pick<Account, "balance" | "include_in_totals">[];
  categories: Pick<Category, "current_balance" | "monthly_amount" | "is_system" | "is_buffer">[];
  creditCards: (CreditCardOwedFields & { include_in_totals: boolean })[];
  pendingChecks: Pick<PendingCheck, "amount" | "type">[];
}) {
  const cents = (value: number) => Math.round(Number(value) * 100);
  const cash = accounts.filter(a => a.include_in_totals === true)
    .reduce((sum, a) => sum + cents(a.balance), 0);
  const reserved = categories.filter(c => !c.is_system || c.is_buffer);
  const envelopes = reserved.reduce((sum, c) => sum + cents(c.current_balance), 0);
  const buffer = categories.filter(c => c.is_buffer)
    .reduce((sum, c) => sum + cents(c.current_balance), 0);
  const cards = creditCards.filter(c => c.include_in_totals === true)
    .reduce((sum, c) => sum + cents(getCreditCardBalanceOwed(c)), 0);
  const pending = pendingChecks.reduce((sum, p) =>
    sum + (p.type === "income" ? 1 : -1) * cents(p.amount), 0);
  const monthly = categories.filter(c => !c.is_system && !c.is_buffer)
    .reduce((sum, c) => sum + cents(c.monthly_amount), 0);
  return {
    total_monies: cash / 100,
    total_envelopes: envelopes / 100,
    buffer_balance: buffer / 100,
    total_credit_card_balances: cards / 100,
    total_pending_checks: pending / 100,
    current_savings: (cash - envelopes - cards + pending) / 100,
    has_negative_envelopes: reserved.some(c => c.current_balance < 0),
    total_monthly_budget: monthly / 100,
  };
}
