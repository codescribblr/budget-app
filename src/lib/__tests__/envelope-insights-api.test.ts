import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), account: vi.fn() }));
vi.mock("@/lib/supabase-queries", () => ({ getAuthenticatedUser: mocks.auth }));
vi.mock("@/lib/account-context", () => ({ getActiveAccountId: mocks.account }));
import { GET } from "@/app/api/categories/[id]/insights/route";
function database(count = 1001, accessible = true, fail = false) {
  const rows = Array.from({ length: count }, (_, id) => ({ id, transaction_id: id, amount: 2, transactions: { date: "2026-10-03", transaction_type: "expense" } }));
  const category = { select: vi.fn(() => category), eq: vi.fn(() => category), maybeSingle: vi.fn(async () => ({ data: accessible ? { id: 7 } : null, error: null })) };
  const splits = { select: vi.fn(() => splits), eq: vi.fn(() => splits), gte: vi.fn(() => splits), lte: vi.fn(() => splits), order: vi.fn(() => splits), range: vi.fn(async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: fail && from > 0 ? new Error("Failed page") : null })) };
  const from = vi.fn((table: string) => table === "categories" ? category : splits);
  mocks.auth.mockResolvedValue({ supabase: { from } });
  return { from, category, splits };
}
const run = (id = "7", month = "2026-10") => GET(new NextRequest(`http://localhost/api/categories/${id}/insights?month=${month}`), { params: Promise.resolve({ id }) });
beforeEach(() => { vi.clearAllMocks(); mocks.account.mockResolvedValue(27); });
describe("scoped, complete envelope insights", () => {
  it("checks ownership and loads every page of this envelope's splits", async () => {
    const { category, splits } = database();
    const response = await run();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.months.at(-1)).toMatchObject({ expenses: 2002, incoming: 0, transactionCount: 1001 });
    expect(category.eq).toHaveBeenCalledWith("account_id", 27);
    expect(splits.eq).toHaveBeenCalledWith("category_id", 7);
    expect(splits.eq).toHaveBeenCalledWith("transactions.budget_account_id", 27);
    expect(splits.gte).toHaveBeenCalledWith("transactions.date", "2026-05-01");
    expect(splits.lte).toHaveBeenCalledWith("transactions.date", "2026-10-31");
    expect(splits.order).toHaveBeenCalledWith("id", { ascending: true });
    expect(splits.range.mock.calls).toEqual([[0,999],[1000,1999]]);
  });
  it("does not query transactions for another budget's category", async () => {
    const { from } = database(0, false);
    expect((await run()).status).toBe(404);
    expect(from).not.toHaveBeenCalledWith("transaction_splits");
  });
  it("rejects invalid IDs and months before querying data", async () => {
    for (const id of ["7abc", "0", "-1", "9007199254740992"]) expect((await run(id)).status).toBe(400);
    expect((await run("7", "2026-13")).status).toBe(400);
    expect(mocks.auth).not.toHaveBeenCalled();
  });
  it("fails rather than displaying partial financial totals", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try { database(1001, true, true); expect((await run()).status).toBe(500); } finally { log.mockRestore(); }
  });
});
