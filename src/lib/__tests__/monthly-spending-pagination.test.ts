import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), account: vi.fn() }));
vi.mock("@/lib/supabase-queries", () => ({ getAuthenticatedUser: mocks.auth }));
vi.mock("@/lib/account-context", () => ({ getActiveAccountId: mocks.account }));
import { GET } from "@/app/api/categories/monthly-spending/route";

type Row = {
  id: number;
  transaction_type: string | null;
  splits: { category_id: number; amount: number }[];
};
function database(rows: Row[], failOnSecondPage = false) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(async (from: number, to: number) => ({
      data: rows.slice(from, to + 1),
      error: failOnSecondPage && from > 0 ? new Error("Page failed") : null,
    })),
  };
  mocks.auth.mockResolvedValue({ supabase: { from: vi.fn(() => query) } });
  return query;
}
const request = () =>
  new Request("http://localhost/api/categories/monthly-spending?month=2026-10");
beforeEach(() => {
  vi.clearAllMocks();
  mocks.account.mockResolvedValue(27);
});
describe("complete monthly envelope spending", () => {
  it("includes transactions and refunds after the first 1,000 rows", async () => {
    const rows: Row[] = Array.from({ length: 1000 }, (_, id) => ({
      id,
      transaction_type: "expense",
      splits: [{ category_id: 1, amount: 2 }],
    }));
    rows.push({
      id: 1000,
      transaction_type: "income",
      splits: [{ category_id: 1, amount: 50 }],
    });
    rows.push({
      id: 1001,
      transaction_type: null,
      splits: [{ category_id: 2, amount: 35 }],
    });
    const query = database(rows);
    const result = await GET(request());
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ "1": 1950, "2": 35 });
    expect(query.range.mock.calls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(query.order).toHaveBeenCalledWith("id", { ascending: true });
    expect(query.eq).toHaveBeenCalledWith("budget_account_id", 27);
    expect(query.gte).toHaveBeenCalledWith("date", "2026-10-01");
    expect(query.lte).toHaveBeenCalledWith("date", "2026-10-31");
  });
  it("returns an error instead of presenting a partial total if a later page fails", async () => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      database(
        Array.from({ length: 1001 }, (_, id) => ({
          id,
          transaction_type: "expense",
          splits: [{ category_id: 1, amount: 2 }],
        })),
        true,
      );
      expect((await GET(request())).status).toBe(500);
    } finally {
      logger.mockRestore();
    }
  });
});
