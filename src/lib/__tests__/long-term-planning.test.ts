import { describe, it, expect } from "vitest";
import {
  holdingDraft,
  prepareHolding,
  loanReduction,
  paymentDay,
} from "../long-term-planning";
import { interfaceRoute } from "../new-look";
import type { Loan, NonCashAsset } from "../types";
const loan = {
  id: 1,
  name: "Car",
  balance: 8000,
  starting_balance: 12000,
  minimum_payment: 325,
  interest_rate: 5.25,
  payment_due_date: 15,
  institution: "Lender",
  open_date: null,
  maturity_date: null,
  include_in_net_worth: true,
  linked_non_cash_asset_id: null,
} as Loan;
const asset = {
  id: 2,
  name: "Retirement",
  asset_type: "investment",
  current_value: 42000,
  estimated_return_percentage: 6.5,
  is_liquid: false,
  is_rmd_qualified: true,
  rentcast_enabled: false,
} as NonCashAsset;
describe("long-term account editing", () => {
  it("patches only changed details without replaying a balance or forecast settings", () => {
    expect(
      prepareHolding(
        "loans",
        { ...holdingDraft(loan), name: "Car loan" },
        loan,
      ),
    ).toEqual({ name: "Car loan" });
    expect(
      prepareHolding(
        "investments",
        { ...holdingDraft(asset), name: "IRA" },
        asset,
      ),
    ).toEqual({ name: "IRA" });
  });
  it("quick updates send exactly the balance field, including zero", () => {
    expect(
      prepareHolding(
        "loans",
        { ...holdingDraft(loan), amount: "0", name: "ignored" },
        loan,
        true,
      ),
    ).toEqual({ balance: 0 });
    expect(
      prepareHolding(
        "investments",
        { ...holdingDraft(asset), amount: "45000" },
        asset,
        true,
      ),
    ).toEqual({ current_value: 45000 });
  });
  it("does not mistake an empty optional value for zero", () => {
    expect(
      prepareHolding("loans", { ...holdingDraft(loan), rate: "" }, loan)
        .interest_rate,
    ).toBeNull();
    expect(
      prepareHolding("loans", { ...holdingDraft(loan), rate: "0" }, loan)
        .interest_rate,
    ).toBe(0);
  });
  it.each(["", "NaN", "1e6", "1.001", "-100", "Infinity"])(
    "rejects invalid recorded amounts %s",
    (amount) => {
      expect(() =>
        prepareHolding("loans", { ...holdingDraft(loan), amount }, loan),
      ).toThrow();
      expect(() =>
        prepareHolding(
          "investments",
          { ...holdingDraft(asset), amount },
          asset,
        ),
      ).toThrow();
    },
  );
  it("validates dates, payment days, rates and asset links", () => {
    for (const changes of [
      { opened: "2026-02-30" },
      { due: "32" },
      { due: "1.5" },
      { rate: "101" },
      { linkedAsset: "0" },
      { linkedAsset: "1x" },
    ])
      expect(() =>
        prepareHolding("loans", { ...holdingDraft(loan), ...changes }, loan),
      ).toThrow();
  });
  it("preserves automatic property valuation configuration during ordinary edits", () => {
    const property = {
      ...asset,
      asset_type: "real_estate" as const,
      rentcast_enabled: true,
    };
    expect(
      prepareHolding(
        "investments",
        { ...holdingDraft(property), name: "Our home" },
        property,
      ),
    ).toEqual({ name: "Our home" });
    expect(() =>
      prepareHolding(
        "investments",
        { ...holdingDraft(property), type: "vehicle" },
        property,
      ),
    ).toThrow("automatic property valuations");
  });
  it("keeps original debt separate from total payments and accepts debt above the starting amount", () => {
    expect(loanReduction(loan)).toMatchObject({
      start: 12000,
      reduction: 4000,
    });
    expect(loanReduction({ ...loan, balance: 13000 })?.reduction).toBe(-1000);
    expect(loanReduction({ ...loan, starting_balance: 0 })).toBeNull();
    expect(loanReduction({ ...loan, starting_balance: null })).toBeNull();
  });
  it("describes saved due days without claiming a payment status", () => {
    expect(paymentDay(11)).toBe("11th of each month");
    expect(paymentDay(22)).toBe("22nd of each month");
    expect(paymentDay(null)).toBe("No due day saved");
  });
  it("switches interfaces at the matching detail page", () => {
    expect(interfaceRoute("/loans/12", "new")).toBe("/new/loans/12");
    expect(interfaceRoute("/new/loans/12", "classic")).toBe("/loans/12");
    expect(interfaceRoute("/non-cash-assets/9", "new")).toBe(
      "/new/investments/9",
    );
    expect(interfaceRoute("/new/investments/9", "classic")).toBe(
      "/non-cash-assets/9",
    );
  });
});
