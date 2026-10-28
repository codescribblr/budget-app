import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  account: vi.fn(),
  guard: vi.fn(),
}));
vi.mock("@/lib/supabase-queries", () => ({ getAuthenticatedUser: mocks.auth }));
vi.mock("@/lib/account-context", () => ({ getActiveAccountId: mocks.account }));
vi.mock("@/lib/net-worth-api-guard", () => ({
  requireRetirementPlanningNetWorthAccess: mocks.guard,
}));
import { GET } from "@/app/api/net-worth/summary/route";
const read = (details = false) =>
  GET(
    new NextRequest(
      `http://localhost/api/net-worth/summary${details ? "?details=true" : ""}`,
    ),
  );
function database(fail = false) {
  const queries: {
    table: string;
    eq: ReturnType<typeof vi.fn>;
    range: ReturnType<typeof vi.fn>;
  }[] = [];
  const row = {
    id: 1,
    name: "Checking",
    balance: 1000,
    include_in_totals: true,
    updated_at: "2026-10-28",
  };
  const from = vi.fn((table: string) => {
    const query = {
      table,
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      range: vi.fn(async (start: number) => ({
        data:
          start === 0
            ? Array.from({ length: 1000 }, (_, i) => ({
                snapshot_date: new Date(Date.UTC(2020, 0, 1 + i))
                  .toISOString()
                  .slice(0, 10),
                net_worth: 500,
              }))
            : [{ snapshot_date: "2026-09-01", net_worth: 750 }],
        error: null,
      })),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({
          data: table === "accounts" ? [row] : [],
          error: fail ? { message: "database failure" } : null,
        }).then(resolve),
    };
    queries.push(query);
    return query;
  });
  mocks.auth.mockResolvedValue({ supabase: { from } });
  return { queries, from };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.guard.mockResolvedValue(null);
  mocks.account.mockResolvedValue(27);
});
describe("net worth summary access and details", () => {
  it("preserves subscription access checks before querying any financial data", async () => {
    const db = database();
    mocks.guard.mockResolvedValue(new Response("Denied", { status: 403 }));
    expect((await read(true)).status).toBe(403);
    expect(db.from).not.toHaveBeenCalled();
  });
  it("scopes all five data sources to the active budget and loads history past 1000 rows", async () => {
    const db = database();
    const response = await read(true);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.current.netWorth).toBe(1000);
    expect(body.items).toHaveLength(1);
    expect(body.snapshots).toHaveLength(1001);
    for (const q of db.queries)
      expect(q.eq).toHaveBeenCalledWith(
        q.table === "net_worth_snapshots" ? "budget_account_id" : "account_id",
        27,
      );
    expect(
      db.queries
        .filter((q) => q.table === "net_worth_snapshots")
        .map((q) => q.range.mock.calls[0]),
    ).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });
  it("keeps record details out of the compact summary response", async () => {
    database();
    const body = await (await read()).json();
    expect(body.items).toBeUndefined();
    expect(body.snapshots).toBeUndefined();
    expect(body.snapshotCount).toBe(1001);
  });
  it("does not return a plausible but incomplete total when a data source fails", async () => {
    database(true);
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await read(true)).status).toBe(500);
    } finally {
      quiet.mockRestore();
    }
  });
});
