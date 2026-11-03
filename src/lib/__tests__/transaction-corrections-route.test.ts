import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  access: vi.fn(),
  active: vi.fn(),
  rpc: vi.fn(),
  schedule: vi.fn(),
}));
vi.mock("@/lib/api-helpers", () => ({ checkWriteAccess: mock.access }));
vi.mock("@/lib/account-context", () => ({ getActiveAccountId: mock.active }));
vi.mock("@/lib/supabase-queries", () => ({
  getAuthenticatedUser: async () => ({ supabase: { rpc: mock.rpc } }),
}));
vi.mock("@/lib/budget/budget-alert-check", () => ({
  scheduleCategoryOverBudgetCheck: mock.schedule,
}));
import { POST } from "@/app/api/transactions/corrections/route";
const body = () => ({
  expectedBudgetId: 27,
  operationId: crypto.randomUUID(),
  records: [{ id: 1, revision: crypto.randomUUID() }],
  patch: { transaction_type: "income" },
});
const request = (value: unknown) =>
  new Request("http://localhost/api/transactions/corrections", {
    method: "POST",
    body: JSON.stringify(value),
  });
beforeEach(() => {
  vi.resetAllMocks();
  mock.access.mockResolvedValue(null);
  mock.active.mockResolvedValue(27);
  mock.rpc.mockResolvedValue({
    data: {
      status: "saved",
      updated: 1,
      transactionIds: [1],
      categoryIds: [2],
    },
    error: null,
  });
});
describe("atomic bulk correction route", () => {
  it("passes only the validated command and emits normal refresh data", async () => {
    const value = body();
    const response = await POST(request(value));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ updated: 1, transactionIds: [1] });
    expect(mock.rpc).toHaveBeenCalledWith("correct_transactions", {
      p_budget_id: 27,
      p_operation_id: value.operationId,
      p_records: value.records,
      p_patch: value.patch,
    });
    expect(mock.schedule).toHaveBeenCalledWith(27, [2]);
  });
  it("rejects a switched budget without writing", async () => {
    expect(
      (await POST(request({ ...body(), expectedBudgetId: 28 }))).status,
    ).toBe(409);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("rejects viewers and invalid input before any save", async () => {
    expect(
      (
        await POST(
          request({ ...body(), patch: { description: "not allowed" } }),
        )
      ).status,
    ).toBe(400);
    mock.access.mockResolvedValue(new Response(null, { status: 403 }));
    expect((await POST(request(body()))).status).toBe(403);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("returns latest versions for explicit review after a conflict", async () => {
    mock.rpc.mockResolvedValue({
      data: { status: "conflict", latest: [{ id: 1 }] },
      error: null,
    });
    const response = await POST(request(body()));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "STALE_RECORD",
      latest: [{ id: 1 }],
    });
    expect(mock.schedule).not.toHaveBeenCalled();
  });
  it.each(["22023", "23503", "42501"])(
    "handles database rejection %s without claiming success",
    async (code) => {
      mock.rpc.mockResolvedValue({ error: { code }, data: null });
      const response = await POST(request(body()));
      expect(response.status).toBe(code === "42501" ? 403 : 400);
      expect(mock.schedule).not.toHaveBeenCalled();
    },
  );
  it("does not claim failure to save if only the follow-up alert fails", async () => {
    mock.schedule.mockImplementation(() => {
      throw new Error("alert failed");
    });
    expect((await POST(request(body()))).status).toBe(200);
  });
});
