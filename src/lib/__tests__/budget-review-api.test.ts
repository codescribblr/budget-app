import { beforeEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  account: vi.fn(),
  subscription: vi.fn(),
  premium: vi.fn(),
}));
vi.mock("@/lib/supabase-queries", () => ({ getAuthenticatedUser: mocks.auth }));
vi.mock("@/lib/account-context", () => ({ getActiveAccountId: mocks.account }));
vi.mock("@/lib/subscription-utils", () => ({
  getUserSubscription: mocks.subscription,
  isPremiumUser: mocks.premium,
}));
import { GET } from "@/app/api/reports/budget-review/route";
function database(fail = false, flag = true) {
  const queries: any[] = [];
  const from = vi.fn((table: string) => {
    const q: any = { table };
    for (const m of ["select", "eq", "order", "gte", "lte"])
      q[m] = vi.fn(() => q);
    q.maybeSingle = vi.fn(async () => ({
      data: { enabled: flag },
      error: null,
    }));
    q.range = vi.fn(async (start: number) => {
      if (table === "categories")
        return {
          data: [
            { id: 1, name: "Food", monthly_amount: 50, current_balance: 20 },
          ],
          error: null,
        };
      if (start && fail) return { error: new Error("Page failed"), data: null };
      return {
        data: Array.from({ length: start ? 1 : 1000 }, (_, i) => ({
          id: start + i,
          date: "2026-10-12",
          total_amount: 1,
          transaction_type: "expense",
          description: "Shop",
          splits: [{ category_id: 1, amount: 1 }],
        })),
        error: null,
      };
    });
    queries.push(q);
    return q;
  });
  return { from, queries };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.account.mockResolvedValue(42);
  mocks.premium.mockReturnValue(true);
  mocks.subscription.mockResolvedValue({});
});
describe("budget review data boundary", () => {
  it("pages all records with a stable order and active household scope", async () => {
    const db = database();
    mocks.auth.mockResolvedValue({ supabase: db });
    const response = await GET(
      new NextRequest(
        "http://local/api/reports/budget-review?startDate=2026-10-01&endDate=2026-10-20&asOf=2026-10-20",
      ),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totals.expenses).toBe(1001);
    expect(body.advanced).toBe(true);
    for (const q of db.queries) {
      expect(q.eq).toHaveBeenCalledWith(
        q.table === "transactions" ? "budget_account_id" : "account_id",
        42,
      );
      if (q.table !== "user_feature_flags")
        expect(q.order).toHaveBeenCalledWith("id", { ascending: true });
    }
    expect(
      db.queries
        .filter((q) => q.table === "transactions")
        .some((q) => q.range.mock.calls.some((c: number[]) => c[0] === 1000)),
    ).toBe(true);
  });
  it("fails instead of showing partial totals after a later page error", async () => {
    mocks.auth.mockResolvedValue({ supabase: database(true) });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      (await GET(new NextRequest("http://local/api/reports/budget-review")))
        .status,
    ).toBe(500);
    spy.mockRestore();
  });
  it.each([
    [false, true],
    [true, false],
  ])(
    "withholds advanced data when premium=%s and flag=%s",
    async (premium, flag) => {
      mocks.premium.mockReturnValue(premium);
      mocks.auth.mockResolvedValue({ supabase: database(false, flag) });
      const body = await (
        await GET(
          new NextRequest(
            "http://local/api/reports/budget-review?startDate=2026-10-01&endDate=2026-10-20",
          ),
        )
      ).json();
      expect(body.advanced).toBe(false);
      expect(body.comparison).toBeNull();
      expect(body.plan).toEqual([]);
      expect(body.months).toEqual([]);
    },
  );
  it("rejects invalid filters and unauthorized requests", async () => {
    expect(
      (
        await GET(
          new NextRequest(
            "http://local/api/reports/budget-review?categoryId=1x",
          ),
        )
      ).status,
    ).toBe(400);
    expect(mocks.auth).not.toHaveBeenCalled();
    mocks.auth.mockRejectedValue(new Error("Unauthorized"));
    expect(
      (await GET(new NextRequest("http://local/api/reports/budget-review")))
        .status,
    ).toBe(401);
  });
  it("does not accept a category outside the active household", async () => {
    mocks.auth.mockResolvedValue({ supabase: database() });
    expect(
      (
        await GET(
          new NextRequest(
            "http://local/api/reports/budget-review?categoryId=999",
          ),
        )
      ).status,
    ).toBe(404);
  });
});
