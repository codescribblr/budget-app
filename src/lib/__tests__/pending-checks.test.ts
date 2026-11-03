import { describe, it, expect } from "vitest";
import {
  pendingEffect,
  pendingTotals,
  pendingCheckCreate,
  pendingCheckUpdate,
} from "../pending-checks";
import { interfaceRoute } from "../new-look";
import type { PendingCheck } from "../types";
const row = (amount: number, type: "expense" | "income") =>
  ({
    id: 1,
    amount,
    type,
    description: "Test",
    created_at: "2026-11-02",
    updated_at: "2026-11-02",
  }) as PendingCheck;
describe("pending adjustments", () => {
  it("reserves outgoing money and includes received deposits once", () => {
    const payment = row(120.12, "expense"),
      deposit = row(50.01, "income");
    expect(pendingEffect(payment)).toBe(-120.12);
    expect(pendingEffect(deposit)).toBe(50.01);
    expect(pendingTotals([payment, deposit])).toEqual({
      outgoing: 120.12,
      incoming: 50.01,
      net: -70.11,
    });
  });
  it("does not hide offsetting pending items behind a zero net value", () => {
    expect(pendingTotals([row(100, "income"), row(100, "expense")])).toEqual({
      outgoing: 100,
      incoming: 100,
      net: 0,
    });
  });
  it("uses cent precision and distinguishes empty results", () => {
    expect(
      pendingTotals([row(0.1, "income"), row(0.2, "income")]).incoming,
    ).toBe(0.3);
    expect(pendingTotals([])).toEqual({ outgoing: 0, incoming: 0, net: 0 });
  });
  it("rejects invalid money, types, and hidden update fields", () => {
    for (const amount of [0, -1, Infinity, NaN, 1.001, 100000000])
      expect(
        pendingCheckCreate.safeParse({ description: "Check", amount }).success,
      ).toBe(false);
    expect(
      pendingCheckCreate.safeParse({ description: " ", amount: 1 }).success,
    ).toBe(false);
    expect(pendingCheckUpdate.safeParse({ type: "refund" }).success).toBe(
      false,
    );
    expect(pendingCheckUpdate.safeParse({ account_id: 28 }).success).toBe(
      false,
    );
    expect(pendingCheckUpdate.safeParse({ revision: "forged" }).success).toBe(
      false,
    );
  });
  it("preserves valid classic payloads and guarded metadata", () => {
    expect(
      pendingCheckCreate.parse({ description: " Check ", amount: 1.25 }),
    ).toEqual({ description: "Check", amount: 1.25, type: "expense" });
    expect(pendingCheckUpdate.parse({ description: "Updated" })).toEqual({
      description: "Updated",
    });
    expect(
      pendingCheckUpdate.parse({
        amount: 2,
        expectedRevision: "00000000-0000-4000-8000-000000000001",
        expectedBudgetId: 27,
      }).expectedBudgetId,
    ).toBe(27);
  });
});
describe("account navigation across interfaces", () => {
  it("keeps account and card details on the same record", () => {
    for (const route of ["/accounts/34", "/credit-cards/12"]) {
      expect(interfaceRoute(route, "new")).toBe(`/new${route}`);
      expect(interfaceRoute(`/new${route}`, "classic")).toBe(route);
    }
    expect(interfaceRoute("/pending-checks", "new")).toBe(
      "/new/pending-checks",
    );
    expect(interfaceRoute("/pending-checks/14", "new")).toBe(
      "/new/pending-checks",
    );
  });
});
