import { describe, expect, it } from "vitest";
import {
  paydayFunding,
  monthlyFundingSuggestion,
  suggestedBufferContribution,
} from "../payday-funding";
import type { Category } from "../types";
const base = {
  available: 100,
  bufferBalance: 500,
  bufferEnabled: true,
  useBuffer: true,
  bufferText: "150",
  total: 250,
};
describe("monthly funding sources", () => {
  it("combines only the chosen buffer money with available money", () => {
    expect(paydayFunding(base)).toMatchObject({
      withdrawal: 150,
      capacity: 250,
      availableAfter: 0,
      bufferAfter: 350,
      fromAvailable: 100,
      canFund: true,
    });
  });
  it("can fund entirely from the buffer when no available money remains", () => {
    expect(paydayFunding({ ...base, available: 0, total: 150 })).toMatchObject({
      fromAvailable: 0,
      availableAfter: 0,
      bufferAfter: 350,
      canFund: true,
    });
  });
  it("keeps the buffer reserved when its switch is off, even with an old typed amount", () => {
    expect(
      paydayFunding({ ...base, useBuffer: false, total: 100 }),
    ).toMatchObject({
      withdrawal: 0,
      capacity: 100,
      bufferAfter: 500,
      canFund: true,
    });
    expect(paydayFunding({ ...base, useBuffer: false }).canFund).toBe(false);
  });
  it("permits deliberately funding from the buffer while preserving available money", () => {
    expect(paydayFunding({ ...base, total: 150 })).toMatchObject({
      fromAvailable: 0,
      availableAfter: 100,
      canFund: true,
    });
  });
  it("uses exact cents for mixed-source totals", () => {
    expect(
      paydayFunding({
        ...base,
        available: 0.1,
        bufferText: "0.20",
        total: 0.3,
      }),
    ).toMatchObject({
      availableAfter: 0,
      fromAvailable: 0.1,
      bufferAfter: 499.8,
      canFund: true,
    });
    expect(
      paydayFunding({ ...base, available: 0.1, bufferText: "0.19", total: 0.3 })
        .canFund,
    ).toBe(false);
  });
  it.each(["", "0", "-1", "1.001", "NaN", "1e2", "501"])(
    "blocks an invalid or excessive buffer contribution: %s",
    (bufferText) => {
      expect(paydayFunding({ ...base, bufferText }).canFund).toBe(false);
    },
  );
  it("never offers unbacked buffer money as available funding", () => {
    expect(paydayFunding({ ...base, bufferText: "501" }).capacity).toBe(100);
  });
  it("does not withdraw more than the envelope allocation", () => {
    expect(paydayFunding({ ...base, total: 149.99 }).error).toContain(
      "more than you’re putting into envelopes",
    );
    expect(paydayFunding({ ...base, total: 0 }).canFund).toBe(false);
  });
  it("requires resolving negative available money before atomic funding", () => {
    expect(paydayFunding({ ...base, available: -25 }).error).toContain(
      "Cover the shortfall",
    );
  });
  it("blocks using a disabled, missing, or unconfirmed buffer", () => {
    expect(paydayFunding({ ...base, bufferEnabled: false }).canFund).toBe(
      false,
    );
    expect(
      paydayFunding({
        ...base,
        bufferEnabled: false,
        useBuffer: false,
        total: 100,
      }).canFund,
    ).toBe(true);
    expect(paydayFunding({ ...base, bufferBalance: 0 }).canFund).toBe(false);
  });
});

const category = (id: number, patch: Partial<Category> = {}): Category => ({
  id,
  name: `Envelope ${id}`,
  monthly_amount: 100,
  current_balance: 0,
  sort_order: id,
  is_system: false,
  category_type: "monthly_expense",
  created_at: "",
  updated_at: "",
  ...patch,
});
const funded = (categoryId: number, fundedAmount: number) => ({
  categoryId,
  fundedAmount,
  remainingToFund: 0,
  targetAmount: 100,
});
describe("remaining monthly funding suggestion", () => {
  it("offers Fund all only when every remaining target can be covered", () => {
    const rows = [category(1), category(2)];
    expect(monthlyFundingSuggestion(rows, [], 200, 0).canFundAll).toBe(true);
    expect(monthlyFundingSuggestion(rows, [], 100, 100).canFundAll).toBe(true);
    expect(monthlyFundingSuggestion(rows, [], 100, 99.99).canFundAll).toBe(
      false,
    );
    expect(
      monthlyFundingSuggestion(rows, [funded(1, 100)], 100, 0).canFundAll,
    ).toBe(true);
    expect(
      monthlyFundingSuggestion(rows, [funded(1, 100), funded(2, 100)], 200, 0)
        .canFundAll,
    ).toBe(false);
    expect(monthlyFundingSuggestion([], [], 200, 0).canFundAll).toBe(false);
    expect(monthlyFundingSuggestion(rows, [], -1, 500).canFundAll).toBe(false);
  });

  it("subtracts funding already recorded for each envelope and covers only the gap", () => {
    const result = monthlyFundingSuggestion(
      [category(1), category(2)],
      [funded(1, 40)],
      100,
      500,
    );
    expect(result).toMatchObject({
      remaining: 160,
      envelopeCount: 2,
      amount: 160,
      buffer: 60,
      shortfall: 0,
      allocations: { 1: "60.00", 2: "100.00" },
    });
    expect(
      paydayFunding({
        available: 100,
        bufferBalance: 500,
        bufferEnabled: true,
        useBuffer: true,
        bufferText: String(result.buffer),
        total: result.amount,
      }).availableAfter,
    ).toBe(0);
  });
  it("suggests the whole buffer when it cannot fully fund the month", () => {
    expect(
      monthlyFundingSuggestion([category(1), category(2)], [], 40, 80),
    ).toMatchObject({
      remaining: 200,
      amount: 120,
      buffer: 80,
      shortfall: 80,
      allocations: { 1: "100.00", 2: "20.00" },
    });
  });
  it("keeps excess available money without withdrawing buffer or overfunding targets", () => {
    expect(monthlyFundingSuggestion([category(1)], [], 500, 500)).toMatchObject(
      { remaining: 100, amount: 100, buffer: 0, shortfall: 0 },
    );
  });
  it("does not use one envelope's excess funding to hide another's remaining target", () => {
    expect(
      monthlyFundingSuggestion(
        [category(1), category(2)],
        [funded(1, 200)],
        0,
        100,
      ),
    ).toMatchObject({
      remaining: 100,
      envelopeCount: 1,
      buffer: 100,
      allocations: { 1: "0.00", 2: "100.00" },
    });
  });
  it("caps monthly contributions at balance targets and includes goal targets while excluding inactive/system envelopes", () => {
    const result = monthlyFundingSuggestion(
      [
        category(1, {
          category_type: "target_balance",
          target_balance: 500,
          current_balance: 450,
        }),
        category(2, { is_goal: true }),
        category(3, { is_archived: true }),
        category(4, { is_system: true }),
        category(5, { is_buffer: true }),
      ],
      [funded(1, 25), funded(2, 25)],
      50,
      500,
    );
    expect(result).toMatchObject({
      remaining: 125,
      amount: 125,
      buffer: 75,
      allocations: { 1: "50.00", 2: "75.00" },
    });
  });
  it.each(["accumulation", "target_balance"] as const)(
    "suggests buffer money only for the remaining monthly %s contribution",
    (category_type) => {
      const medical = category(1, {
        name: "Medical",
        category_type,
        monthly_amount: 200,
        annual_target: 2400,
        target_balance: 5000,
        current_balance: 200,
      });
      expect(monthlyFundingSuggestion([medical], [], 0, 5000)).toMatchObject({
        remaining: 200,
        amount: 200,
        buffer: 200,
        canFundAll: true,
        allocations: { 1: "200.00" },
      });
      expect(
        monthlyFundingSuggestion([medical], [funded(1, 75)], 25, 5000),
      ).toMatchObject({
        remaining: 125,
        amount: 125,
        buffer: 100,
        allocations: { 1: "125.00" },
      });
      expect(
        monthlyFundingSuggestion([medical], [funded(1, 200)], 0, 5000),
      ).toMatchObject({
        remaining: 0,
        amount: 0,
        buffer: 0,
        canFundAll: false,
        allocations: { 1: "0.00" },
      });
    },
  );
  it("stops reserve funding at its balance target and leaves zero-monthly reserves manual", () => {
    const reserve = category(1, {
      category_type: "target_balance",
      monthly_amount: 200,
      target_balance: 5000,
      current_balance: 4980,
    });
    expect(monthlyFundingSuggestion([reserve], [], 0, 5000)).toMatchObject({
      remaining: 20,
      buffer: 20,
      allocations: { 1: "20.00" },
    });
    expect(
      monthlyFundingSuggestion([{ ...reserve, monthly_amount: 0 }], [], 0, 5000),
    ).toMatchObject({ remaining: 0, buffer: 0, canFundAll: false });
    expect(
      monthlyFundingSuggestion([{ ...reserve, current_balance: 5100 }], [], 0, 5000),
    ).toMatchObject({ remaining: 0, buffer: 0, canFundAll: false });
  });
  it("preserves priority order when money is limited, with goal envelopes included", () => {
    const rows = [
      category(1, { priority: 5 }),
      category(2, { priority: 1, is_goal: true }),
    ];
    expect(monthlyFundingSuggestion(rows, [], 25, 0).allocations).toEqual({
      1: "0.00",
      2: "25.00",
    });
    expect(
      monthlyFundingSuggestion(rows, [], 25, 0, false).allocations,
    ).toEqual({ 1: "25.00", 2: "0.00" });
  });
  it("handles a fully funded month, empty list, and empty buffer without unnecessary withdrawals", () => {
    expect(
      monthlyFundingSuggestion([category(1)], [funded(1, 100)], 0, 500),
    ).toMatchObject({ remaining: 0, amount: 0, buffer: 0, envelopeCount: 0 });
    expect(monthlyFundingSuggestion([], [], 0, 500)).toMatchObject({
      remaining: 0,
      amount: 0,
      buffer: 0,
    });
    expect(monthlyFundingSuggestion([category(1)], [], 0, 0)).toMatchObject({
      amount: 0,
      buffer: 0,
      shortfall: 100,
    });
  });
  it("keeps cents exact and also suggests for a custom allocation amount", () => {
    expect(suggestedBufferContribution(100.01, 80, 50)).toBe(20.01);
    expect(suggestedBufferContribution(100.01, 80, 20)).toBe(20);
    expect(suggestedBufferContribution(100, 120, 50)).toBe(0);
  });
});
