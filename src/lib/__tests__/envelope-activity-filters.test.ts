import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), account: vi.fn(), admin: vi.fn() }));
vi.mock("@/lib/supabase-queries", () => ({ getAuthenticatedUser: mocks.auth }));
vi.mock("@/lib/account-context", () => ({ getActiveAccountId: mocks.account }));
vi.mock("@/lib/supabase/server", () => ({ createServiceRoleClient: mocks.admin }));
import { GET } from "@/app/api/categories/[id]/audit/route";
function database(accessible = true) {
  const category = { select: vi.fn(() => category), eq: vi.fn(() => category), single: vi.fn(async () => ({ data: accessible ? { id: 7, current_balance: 100 } : null, error: null })) };
  const audit = { select: vi.fn(() => audit), eq: vi.fn(() => audit), order: vi.fn(() => audit), range: vi.fn(() => audit), in: vi.fn(() => audit), not: vi.fn(() => audit), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], count: 0, error: null }).then(resolve) };
  const from = vi.fn((table: string) => table === "categories" ? category : audit);
  mocks.auth.mockResolvedValue({ supabase: { from } });
  return { category, audit, from };
}
const run = (query: string) => GET(new NextRequest(`http://localhost/api/categories/7/audit?${query}`), { params: Promise.resolve({ id: "7" }) });
beforeEach(() => { vi.clearAllMocks(); mocks.account.mockResolvedValue(27); });
describe("full-history activity filters", () => {
  it("applies funding filters to the database query along with account scope and paging", async () => {
    const { audit } = database();
    expect((await run("group=funding&offset=20&limit=20")).status).toBe(200);
    expect(audit.in).toHaveBeenCalledWith("change_type", ["allocation_batch", "allocation_manual", "allocation_income"]);
    expect(audit.eq).toHaveBeenCalledWith("account_id", 27);
    expect(audit.range).toHaveBeenCalledWith(20, 39);
    expect(audit.order).toHaveBeenCalledWith("id", { ascending: false });
  });
  it("keeps adjustments distinct from allocations, transfers, and transaction edits", async () => {
    const { audit } = database();
    expect((await run("group=adjustments")).status).toBe(200);
    expect(audit.not).toHaveBeenCalledWith("change_type", "in", expect.stringContaining("transaction_update"));
    expect(audit.not).toHaveBeenCalledWith("change_type", "in", expect.stringContaining("allocation_manual"));
    expect(audit.not).toHaveBeenCalledWith("change_type", "in", expect.stringContaining("transfer_from"));
  });
  it("retains unfiltered popup behavior", async () => {
    const { audit } = database();
    expect((await run("")).status).toBe(200);
    expect(audit.in).not.toHaveBeenCalled(); expect(audit.not).not.toHaveBeenCalled();
  });
  it("rejects invalid filters and never queries another budget's audit history", async () => {
    const { from } = database(false);
    expect((await run("group=all")).status).toBe(404);
    expect(from).not.toHaveBeenCalledWith("category_balance_audit");
    database();
    for (const query of ["group=bad", "offset=-1", "limit=1000", "offset=1.5", "limit=NaN"]) expect((await run(query)).status).toBe(400);
  });
});
