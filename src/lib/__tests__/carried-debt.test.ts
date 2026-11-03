import { describe, it, expect } from "vitest";
import { carriedDebtPatch, carriedDebtTotal } from "../carried-debt";
describe("explicit carried debt", () => {
  it("never substitutes a statement or live balance for unreviewed debt", () => {
    const cards = [
      { current_balance: 8000, statement_balance: 5000 },
      { carried_debt_balance: null, current_balance: 1000 },
      { carried_debt_balance: 0, current_balance: 2500 },
      { carried_debt_balance: 700.25 },
    ];
    expect(carriedDebtTotal(cards)).toBe(700.25);
  });
  it("records paid-in-full cards as zero without modifying liability fields", () => {
    expect(carriedDebtPatch("2500", "2026-01-01", "none")).toEqual({
      carried_debt_balance: 0,
      carried_debt_as_of: "2026-01-01",
    });
  });
  it("keeps unclassified separate from zero", () => {
    expect(carriedDebtPatch("2500", "2026-01-01", "unknown")).toEqual({
      carried_debt_balance: null,
      carried_debt_as_of: null,
    });
  });
  it("validates carried amounts and future dates", () => {
    for (const n of ["-1", "1.001", "NaN", ""])
      expect(() => carriedDebtPatch(n, "2026-01-01", "carried")).toThrow();
    expect(() => carriedDebtPatch("12", "2999-01-01", "carried")).toThrow();
    expect(
      carriedDebtPatch("850.42", "2026-01-01", "carried").carried_debt_balance,
    ).toBe(850.42);
  });
});
