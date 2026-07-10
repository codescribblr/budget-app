/** Minimal fields for balance owed (net worth, dashboard). */
export type CreditCardOwedFields = {
  current_balance?: number | null;
  credit_limit?: number;
  available_credit?: number;
};

/** Minimal fields for statement balance (payoff planning). */
export type CreditCardStatementFields = {
  statement_balance?: number | null;
};

/**
 * Balance owed on the card — always credit_limit − available_credit (stored as current_balance).
 * Used for net worth, dashboard totals, and debt-paydown goal progress.
 */
export function getCreditCardBalanceOwed(card: CreditCardOwedFields): number {
  if (card.current_balance != null && !Number.isNaN(card.current_balance)) {
    return Math.max(0, card.current_balance);
  }
  const limit = card.credit_limit ?? 0;
  const available = card.available_credit ?? 0;
  return Math.max(0, limit - available);
}

/**
 * Statement balance from the last bill — for monthly reconcile and payoff planning only.
 * Not used for net worth (live available credit reflects in-month usage before payoff).
 */
export function getCreditCardStatementBalance(card: CreditCardStatementFields): number | null {
  const balance = card.statement_balance;
  if (balance == null || balance < 0 || Number.isNaN(balance)) {
    return null;
  }
  return balance;
}

export function sumCreditCardBalanceOwed(
  cards: (CreditCardOwedFields & { include_in_totals?: boolean })[],
  options?: { includeInTotalsOnly?: boolean }
): number {
  const list = options?.includeInTotalsOnly
    ? cards.filter((c) => c.include_in_totals !== false)
    : cards;
  return list.reduce((sum, card) => sum + getCreditCardBalanceOwed(card), 0);
}
