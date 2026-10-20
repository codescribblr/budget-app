import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mock = vi.hoisted(() => ({ auth: vi.fn(), account: vi.fn() }));
vi.mock("@/lib/supabase-queries", () => ({ getAuthenticatedUser: mock.auth }));
vi.mock("@/lib/account-context", () => ({ getActiveAccountId: mock.account }));
import { GET } from "@/app/api/transactions/review/route";

function database(failSecondPage = false) {
  const queries: any[] = [];
  const from = vi.fn((table: string) => {
    const q: any = { table, fields: "" };
    for (const method of [
      "eq",
      "gte",
      "lte",
      "ilike",
      "in",
      "or",
      "is",
      "order",
    ])
      q[method] = vi.fn(() => q);
    q.select = vi.fn((fields: string) => {
      q.fields = fields;
      return q;
    });
    q.range = vi.fn(async (start: number) => {
      if (q.fields.startsWith("*"))
        return {
          data: [
            {
              id: 1,
              date: "2026-10-01",
              description: "Bank detail",
              total_amount: "40",
              transaction_type: "expense",
              splits: [
                {
                  id: 1,
                  category_id: 5,
                  amount: "10",
                  categories: { name: "Food" },
                },
              ],
              merchant_groups: { display_name: "Shop" },
              accounts: { name: "Checking" },
            },
          ],
          count: 1001,
          error: null,
        };
      if (start && failSecondPage)
        return { data: null, error: new Error("Database unavailable") };
      return {
        data: Array.from({ length: start ? 1 : 1000 }, (_, i) => ({
          id: start + i,
          total_amount: 40,
          transaction_type: "expense",
          category_filter: [{ amount: 10 }],
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
  mock.account.mockResolvedValue(42);
});
describe("transaction review endpoint", () => {
  it("pages every matching amount and hydrates the visible records", async () => {
    const db = database();
    mock.auth.mockResolvedValue({ supabase: db });
    const response = await GET(
      new NextRequest(
        "http://localhost/api/transactions/review?categoryId=5&pageSize=25&page=2",
      ),
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.summary).toEqual({
      count: 1001,
      expenses: 10010,
      income: 0,
      categoryAmounts: true,
    });
    expect(data.totalPages).toBe(41);
    expect(data.transactions[0]).toMatchObject({
      merchant_name: "Shop",
      account_name: "Checking",
      total_amount: 40,
      splits: [{ category_name: "Food", amount: 10 }],
    });
    expect(db.queries[0].range).toHaveBeenCalledWith(25, 49);
    expect(
      db.queries.some((q) =>
        q.range.mock.calls.some((c: number[]) => c[0] === 1000),
      ),
    ).toBe(true);
    for (const q of db.queries) {
      expect(q.eq).toHaveBeenCalledWith("budget_account_id", 42);
      expect(q.in).toHaveBeenCalledWith("category_filter.category_id", [5]);
    }
  });
  it("fails the whole response when a later summary page fails", async () => {
    const db = database(true);
    mock.auth.mockResolvedValue({ supabase: db });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      (await GET(new NextRequest("http://localhost/api/transactions/review")))
        .status,
    ).toBe(500);
    spy.mockRestore();
  });
  it("rejects invalid paging before querying and requires authentication", async () => {
    expect(
      (
        await GET(
          new NextRequest(
            "http://localhost/api/transactions/review?pageSize=100000",
          ),
        )
      ).status,
    ).toBe(400);
    expect(mock.auth).not.toHaveBeenCalled();
    mock.auth.mockRejectedValue(new Error("Unauthorized"));
    expect(
      (await GET(new NextRequest("http://localhost/api/transactions/review")))
        .status,
    ).toBe(401);
  });
});
