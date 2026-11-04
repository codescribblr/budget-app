import { describe, expect, it } from "vitest";
import { calculateBudgetTotals } from "../budget-totals";
import { normalizeMoneyExpectation } from "../money-precision";

const base = {
  accounts: [{ balance: 1000.10, include_in_totals: true }],
  categories: [
    { current_balance: 250.20, monthly_amount: 200, is_system: false },
    { current_balance: 500, monthly_amount: 0, is_system: true, is_buffer: true },
  ],
  creditCards: [],
  pendingChecks: [],
};
describe("cent-exact budget totals", () => {
  it("does not send fractional-cent arithmetic residue back as an optimistic precondition", () => {
    const oldTotal = 1000.10 - 250.20 - 500;
    expect(oldTotal).not.toBe(249.9);
    const total = calculateBudgetTotals(base).current_savings;
    expect(total).toBe(249.9);
    expect(JSON.stringify({ expectedAvailable: total })).toBe('{"expectedAvailable":249.9}');
    expect(normalizeMoneyExpectation(oldTotal)).toBe(total);
  });
  it("keeps the same inclusion, credit, pending-payment, and buffer rules as the database", () => {
    expect(calculateBudgetTotals({
      accounts: [...base.accounts, { balance: 200.20, include_in_totals: true }, { balance: 999, include_in_totals: false }],
      categories: [...base.categories,
        { current_balance: 999, monthly_amount: 999, is_system: true },
        { current_balance: -50.10, monthly_amount: 1.10, is_system: false },
      ],
      creditCards: [
        { current_balance: 75.15, include_in_totals: true },
        { current_balance: -10, include_in_totals: true },
        { current_balance: 100, include_in_totals: false },
      ],
      pendingChecks: [{ amount: 12.34, type: "income" }, { amount: 5.67, type: "expense" }],
    })).toEqual({
      total_monies: 1200.30, total_envelopes: 700.10, buffer_balance: 500,
      total_credit_card_balances: 75.15, total_pending_checks: 6.67,
      current_savings: 431.72, has_negative_envelopes: true, total_monthly_budget: 201.10,
    });
  });
  it("sums many decimal balances exactly and preserves negative Available", () => {
    const categories = Array.from({length: 100}, () => ({current_balance: 0.10, monthly_amount: 0.10, is_system: false}));
    expect(calculateBudgetTotals({...base, accounts: [], categories})).toMatchObject({
      total_envelopes: 10, current_savings: -10, total_monthly_budget: 10,
    });
    expect(calculateBudgetTotals({...base, accounts: [], categories: []}).current_savings).toBe(0);
  });
});
describe("reviewed money expectations", () => {
  it("removes binary residue without masking a one-cent difference", () => {
    expect(normalizeMoneyExpectation(0.1 + 0.2)).toBe(0.3);
    expect(normalizeMoneyExpectation(-249.9000000000001)).toBe(-249.9);
    expect(normalizeMoneyExpectation(249.91)).not.toBe(normalizeMoneyExpectation(249.9000000000001));
  });
  it.each([null, "249.90", NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER])("rejects invalid expectations: %s", value => {
    expect(() => normalizeMoneyExpectation(value)).toThrow("Invalid reviewed balance");
  });
});
