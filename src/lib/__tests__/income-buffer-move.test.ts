import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  auth: vi.fn(),
  summary: vi.fn(),
  log: vi.fn(),
  account: vi.fn(),
}));
vi.mock("../supabase-queries", () => ({
  getAuthenticatedUser: mocks.auth,
  getDashboardSummary: mocks.summary,
}));
vi.mock("../account-context", () => ({ getActiveAccountId: mocks.account }));
vi.mock("../api-helpers", () => ({ checkWriteAccess: mocks.access }));
vi.mock("../audit/category-balance-audit", () => ({
  logBalanceChange: mocks.log,
}));
import { moveIncomeBuffer } from "../income-buffer-move";

let update = vi.fn<(payload: unknown) => void>();
let equals = vi.fn<(...args: unknown[]) => void>();
function database({ enabled = true, changed = true, balance = 100 } = {}) {
  update = vi.fn();
  equals = vi.fn();
  const from = vi.fn((table: string) => {
    let writing = false;
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((...args: unknown[]) => {
        equals(...args);
        return query;
      }),
      update: vi.fn((payload: unknown) => {
        writing = true;
        update(payload);
        return query;
      }),
      single: vi.fn(async () => ({
        data: { id: 10, current_balance: balance },
        error: null,
      })),
      maybeSingle: vi.fn(async () => ({
        data:
          table === "user_feature_flags"
            ? { enabled }
            : writing && changed
              ? { id: 10 }
              : null,
        error: null,
      })),
    };
    return query;
  });
  mocks.auth.mockResolvedValue({ supabase: { from } });
}
const request = (body: unknown) =>
  new Request("http://localhost/api/income-buffer/add", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.account.mockResolvedValue(27);
  mocks.access.mockResolvedValue(null);
  mocks.summary.mockResolvedValue({ current_savings: 200 });
  database();
});
describe("shared income buffer writes", () => {
  it.each(["add", "release"] as const)(
    "blocks a viewer from %s",
    async (direction) => {
      mocks.access.mockResolvedValue(
        NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      );
      expect(
        (await moveIncomeBuffer(request({ amount: 10 }), direction)).status,
      ).toBe(403);
      expect(update).not.toHaveBeenCalled();
    },
  );
  it.each(["10", 0, -1, 1.001, null, 1e12])(
    "rejects invalid money %s",
    async (amount) => {
      expect((await moveIncomeBuffer(request({ amount }), "add")).status).toBe(
        400,
      );
      expect(update).not.toHaveBeenCalled();
    },
  );
  it("cannot add expected income that is not available", async () => {
    mocks.summary.mockResolvedValue({ current_savings: 1 });
    expect(
      (await moveIncomeBuffer(request({ amount: 2500 }), "add")).status,
    ).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
  it("cannot release more than the buffer", async () => {
    expect(
      (await moveIncomeBuffer(request({ amount: 101 }), "release")).status,
    ).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
  it("rejects an already-stale preview", async () => {
    expect(
      (
        await moveIncomeBuffer(
          request({ amount: 10, expectedBalance: 99 }),
          "add",
        )
      ).status,
    ).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });
  it("detects a concurrent buffer update and does not log a false change", async () => {
    database({ changed: false });
    expect(
      (
        await moveIncomeBuffer(
          request({ amount: 10, expectedBalance: 100 }),
          "release",
        )
      ).status,
    ).toBe(409);
    expect(equals).toHaveBeenCalledWith("current_balance", 100);
    expect(mocks.log).not.toHaveBeenCalled();
  });
  it("records a scoped release and preserves the existing API shape", async () => {
    const response = await moveIncomeBuffer(
      request({ amount: 10.25, expectedBalance: 100 }),
      "release",
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      newBalance: 89.75,
      amountWithdrawn: 10.25,
    });
    expect(equals).toHaveBeenCalledWith("account_id", 27);
    expect(mocks.log).toHaveBeenCalledWith(
      10,
      100,
      89.75,
      "income_buffer_fund",
      { direction: "release" },
    );
  });
  it("continues to accept classic clients without a preview balance", async () => {
    const response = await moveIncomeBuffer(request({ amount: 0.1 }), "add");
    expect(await response.json()).toMatchObject({
      newBalance: 100.1,
      amountAdded: 0.1,
    });
  });
  it("blocks writes when the feature is disabled", async () => {
    database({ enabled: false });
    expect(
      (await moveIncomeBuffer(request({ amount: 10 }), "add")).status,
    ).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });
});
