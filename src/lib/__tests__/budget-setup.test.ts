import { describe, expect, it } from "vitest";
import type { Account, Category, CreditCard } from "../types";
import {
  accountBudgetContribution,
  envelopeArchiveBlock,
  prepareAccountSetup,
  prepareEnvelopeSetup,
  setupReturnTarget,
  type AccountSetupDraft,
  type EnvelopeSetupDraft,
} from "../budget-setup";
import { interfaceRoute } from "../new-look";

const account = {
  id: 1,
  name: "Checking",
  balance: 2400,
  account_type: "checking",
  include_in_totals: true,
} as Account;
const card = {
  id: 2,
  name: "Visa",
  credit_limit: 5000,
  available_credit: 4200,
  current_balance: 800,
  statement_balance: 350,
  include_in_totals: true,
} as CreditCard;
const accountDraft: AccountSetupDraft = {
  name: "Checking",
  balance: "2400",
  accountType: "checking",
  limit: "5000",
  available: "4200",
  included: true,
};
const envelope = {
  id: 3,
  name: "Groceries",
  monthly_amount: 500,
  current_balance: 140,
  category_type: "monthly_expense",
  priority: 4,
  notes: "",
} as Category;
const envelopeDraft: EnvelopeSetupDraft = {
  name: "Groceries",
  purpose: "monthly_expense",
  monthly: "500",
  annual: "1200",
  target: "3000",
  priority: 4,
  notes: "weekly shopping",
};

describe("account setup preserves the manual balance model", () => {
  it("changes account settings without overwriting a balance updated elsewhere", () => {
    const prepared = prepareAccountSetup(
      { kind: "account", item: account },
      { ...accountDraft, name: "Main bank", balance: "100", included: false },
    );
    expect(prepared.payload).toEqual({
      name: "Main bank",
      account_type: "checking",
      include_in_totals: false,
    });
    expect(prepared.contribution).toBe(0);
  });
  it("creates an account with an explicit recorded balance, including an overdraft", () => {
    const prepared = prepareAccountSetup(
      { kind: "account", item: null },
      { ...accountDraft, balance: "-12.34" },
    );
    expect(prepared.payload).toMatchObject({ balance: -12.34 });
    expect(prepared.contribution).toBe(-12.34);
  });
  it("preserves statement balances and does not resubmit unchanged card balances", () => {
    const prepared = prepareAccountSetup(
      { kind: "card", item: card },
      { ...accountDraft, name: "Daily card" },
    );
    expect(prepared.payload).toEqual({
      name: "Daily card",
      include_in_totals: true,
    });
    expect(prepared.contribution).toBe(-800);
  });
  it("submits limit and available credit together when the limit changes", () => {
    const prepared = prepareAccountSetup(
      { kind: "card", item: card },
      { ...accountDraft, limit: "7500", available: "6700" },
    );
    expect(prepared.payload).toMatchObject({
      credit_limit: 7500,
      available_credit: 6700,
    });
    expect(prepared.contribution).toBe(-800);
  });
  it("does not treat a card credit as spendable cash", () => {
    const prepared = prepareAccountSetup(
      { kind: "card", item: null },
      { ...accountDraft, available: "5075.25" },
    );
    expect(prepared.balance).toBe(-75.25);
    expect(prepared.contribution).toBe(0);
  });
  it("allows negative available credit for a card over its limit", () => {
    expect(
      prepareAccountSetup(
        { kind: "card", item: card },
        { ...accountDraft, available: "-20.01" },
      ).contribution,
    ).toBe(-5020.01);
  });
  it.each(["", "1e4", "Infinity", "12.123"])(
    "rejects malformed money: %s",
    (value) => {
      expect(() =>
        prepareAccountSetup(
          { kind: "account", item: null },
          { ...accountDraft, balance: value },
        ),
      ).toThrow();
      expect(() =>
        prepareAccountSetup(
          { kind: "card", item: null },
          { ...accountDraft, available: value },
        ),
      ).toThrow();
    },
  );
  it("rejects negative credit limits", () => {
    expect(() =>
      prepareAccountSetup(
        { kind: "card", item: null },
        { ...accountDraft, limit: "-1" },
      ),
    ).toThrow();
  });
  it("excludes tracked-only cash and debt from the budget", () => {
    expect(accountBudgetContribution("account", 1000, false)).toBe(0);
    expect(accountBudgetContribution("card", 1000, false)).toBe(0);
  });
});

describe("envelope setup changes plans, never balances", () => {
  it("returns setup detours to their check-in while keeping standalone visits standalone", () => {
    expect(setupReturnTarget("accounts", "daily").href).toBe(
      "/new/accounts?checkin=daily",
    );
    expect(setupReturnTarget("envelopes", "monthly").href).toBe(
      "/new/plan?checkin=monthly",
    );
    expect(setupReturnTarget("envelopes", "weekly").href).toBe(
      "/new/budget?checkin=weekly",
    );
    expect(setupReturnTarget("envelopes", null).href).toBe("/new/budget");
    expect(setupReturnTarget("accounts", "https://example.com").href).toBe(
      "/new/accounts",
    );
  });
  it("creates a plan without funding it or changing monthly funding history", () => {
    expect(prepareEnvelopeSetup(envelopeDraft, null, true, true)).toEqual({
      name: "Groceries",
      notes: "weekly shopping",
      category_type: "monthly_expense",
      monthly_amount: 500,
      priority: 4,
    });
  });
  it("keeps annual targets exact, letting the shared API derive the monthly equivalent", () => {
    const payload = prepareEnvelopeSetup(
      { ...envelopeDraft, purpose: "accumulation", annual: "1000" },
      envelope,
      true,
      false,
    );
    expect(payload.annual_target).toBe(1000);
    expect(payload.monthly_amount).toBe(1000 / 12);
    expect(payload).not.toHaveProperty("current_balance");
  });
  it("supports a reserve with no fixed monthly contribution", () => {
    const payload = prepareEnvelopeSetup(
      { ...envelopeDraft, purpose: "target_balance", monthly: "0" },
      envelope,
      true,
      false,
    );
    expect(payload).toMatchObject({
      category_type: "target_balance",
      monthly_amount: 0,
      target_balance: 3000,
    });
  });
  it("does not convert advanced envelopes or overwrite targets when their feature is disabled", () => {
    const payload = prepareEnvelopeSetup(
      { ...envelopeDraft, name: "Annual bills" },
      { ...envelope, category_type: "accumulation", annual_target: 1000 },
      false,
      false,
    );
    expect(payload).toEqual({ name: "Annual bills", notes: "weekly shopping" });
  });
  it("keeps basic new envelopes monthly and preserves existing priority when unavailable", () => {
    const payload = prepareEnvelopeSetup(
      { ...envelopeDraft, purpose: "accumulation", priority: 1 },
      null,
      false,
      false,
    );
    expect(payload.category_type).toBe("monthly_expense");
    expect(payload).not.toHaveProperty("priority");
  });
  it.each(["is_goal", "is_buffer", "is_system"])(
    "protects linked categories: %s",
    (key) => {
      const special = { ...envelope, [key]: true };
      expect(() =>
        prepareEnvelopeSetup(envelopeDraft, special, true, true),
      ).toThrow();
      expect(envelopeArchiveBlock(special)).toBeTruthy();
    },
  );
  it.each(["", "-1", "1.001", "NaN"])(
    "rejects invalid funding targets: %s",
    (monthly) => {
      expect(() =>
        prepareEnvelopeSetup(
          { ...envelopeDraft, monthly },
          envelope,
          true,
          true,
        ),
      ).toThrow();
    },
  );
  it("requires a zero balance before hiding an active envelope", () => {
    expect(envelopeArchiveBlock(envelope)).toBeTruthy();
    expect(
      envelopeArchiveBlock({ ...envelope, current_balance: -0.01 }),
    ).toBeTruthy();
    expect(
      envelopeArchiveBlock({ ...envelope, current_balance: 0 }),
    ).toBeNull();
    expect(envelopeArchiveBlock({ ...envelope, is_archived: true })).toBeNull();
  });
  it("switches setup pages to their corresponding classic tools", () => {
    expect(interfaceRoute("/new/accounts/manage", "classic")).toBe("/accounts");
    expect(interfaceRoute("/new/budget/manage", "classic")).toBe("/categories");
  });
});
