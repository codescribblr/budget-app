import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), account: vi.fn() }));
vi.mock("@/lib/supabase-queries", () => ({ getAuthenticatedUser: mocks.auth }));
vi.mock("@/lib/account-context", () => ({ getActiveAccountId: mocks.account }));
import { GET, POST } from "@/app/api/checkins/route";
import { GET as recent } from "@/app/api/categories/recent/route";
const input = {
  accountId: 27,
  cadence: "daily",
  period: "2026-10-27",
  timeZone: "America/New_York",
};
const read = (extra = {}) =>
  GET(
    new NextRequest(
      `http://localhost/api/checkins?${new URLSearchParams(Object.entries({ ...input, ...extra }).map(([k, v]) => [k, String(v)]))}`,
    ),
  );
const save = (extra = {}) =>
  POST(
    new NextRequest("http://localhost/api/checkins", {
      method: "POST",
      body: JSON.stringify({ ...input, task: "budget", ...extra }),
    }),
  );
function database() {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  const rpc = vi
    .fn()
    .mockResolvedValue({
      data: {
        items: {
          accounts: "2026-10-27T12:00:00Z",
          budget: "2026-10-27T13:00:00Z",
        },
        completed_at: "2026-10-27T13:00:00Z",
      },
      error: null,
    });
  const from = vi.fn(() => query);
  mocks.auth.mockResolvedValue({
    user: { id: "owner" },
    supabase: { from, rpc },
  });
  return { query, rpc, from };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-27T13:00:00Z"));
  mocks.account.mockResolvedValue(27);
});
afterEach(() => vi.useRealTimers());
describe("check-in API", () => {
  it("reads only the signed-in user's active-budget current-period record", async () => {
    const { query } = database();
    expect((await read()).status).toBe(200);
    expect(query.eq.mock.calls).toEqual([
      ["user_id", "owner"],
      ["account_id", 27],
      ["cadence", "daily"],
      ["period_start", "2026-10-27"],
    ]);
  });
  it("saves via atomic merge and returns the persisted completion", async () => {
    const { rpc } = database();
    const response = await save();
    expect(await response.json()).toMatchObject({
      completedAt: "2026-10-27T13:00:00Z",
    });
    expect(rpc).toHaveBeenCalledWith("save_budget_checkin", {
      p_account_id: 27,
      p_cadence: "daily",
      p_period_start: "2026-10-27",
      p_items: { budget: "2026-10-27T13:00:00.000Z" },
      p_planning: false,
    });
  });
  it("uses Sunday and the first of the month as stored period starts", async () => {
    const { rpc } = database();
    expect(
      (await save({ cadence: "weekly", period: "2026-10-25" })).status,
    ).toBe(200);
    expect(
      (
        await save({
          cadence: "monthly",
          period: "2026-10",
          task: "plan",
          planning: true,
        })
      ).status,
    ).toBe(200);
    expect(rpc.mock.calls.map((call) => call[1].p_period_start)).toEqual([
      "2026-10-25",
      "2026-10-01",
    ]);
  });
  it("rejects stale periods, changed budgets, invalid zones and unrelated steps", async () => {
    const { rpc, from } = database();
    expect((await read({ accountId: 28 })).status).toBe(409);
    expect((await save({ period: "2026-10-26" })).status).toBe(409);
    expect((await save({ timeZone: "invalid" })).status).toBe(400);
    expect((await save({ task: "goals" })).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });
  it("does not report success when persistence fails", async () => {
    const { rpc } = database();
    rpc.mockResolvedValue({ data: null, error: new Error("Offline") });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await save()).status).toBe(500);
    } finally {
      log.mockRestore();
    }
  });
  it("requires authentication", async () => {
    mocks.auth.mockRejectedValue(new Error("Unauthorized"));
    expect((await read()).status).toBe(401);
    expect((await save()).status).toBe(401);
  });
});
describe("recent envelope API", () => {
  it("queries the active budget and rejects an account switch race", async () => {
    const { rpc } = database();
    expect(
      (
        await recent(
          new NextRequest(
            "http://localhost/api/categories/recent?accountId=27",
          ),
        )
      ).status,
    ).toBe(200);
    expect(rpc).toHaveBeenCalledWith("recent_budget_envelopes", {
      p_account_id: 27,
    });
    rpc.mockClear();
    expect(
      (
        await recent(
          new NextRequest(
            "http://localhost/api/categories/recent?accountId=28",
          ),
        )
      ).status,
    ).toBe(409);
    expect(rpc).not.toHaveBeenCalled();
  });
});
