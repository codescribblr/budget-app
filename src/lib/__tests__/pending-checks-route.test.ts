import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  write: vi.fn(),
  active: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  guarded: vi.fn(),
  guardedDelete: vi.fn(),
}));
vi.mock("@/lib/api-helpers", () => ({ checkWriteAccess: mocks.write }));
vi.mock("@/lib/account-context", () => ({ getActiveAccountId: mocks.active }));
vi.mock("@/lib/supabase-queries", () => ({
  createPendingCheck: mocks.create,
  updatePendingCheck: mocks.update,
  deletePendingCheck: mocks.remove,
}));
vi.mock("@/lib/guarded-record-route", () => ({
  guardedRecordUpdate: mocks.guarded,
  guardedDelete: mocks.guardedDelete,
}));
import { POST } from "@/app/api/pending-checks/route";
import { PATCH, DELETE } from "@/app/api/pending-checks/[id]/route";
const request = (method: string, body: unknown) =>
  new NextRequest("http://localhost/api/pending-checks/1", {
    method,
    body: JSON.stringify(body),
  });
const params = { params: Promise.resolve({ id: "1" }) };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.write.mockResolvedValue(null);
  mocks.active.mockResolvedValue(27);
  mocks.create.mockResolvedValue({ id: 1 });
  mocks.update.mockResolvedValue({ id: 1 });
  mocks.guarded.mockResolvedValue(null);
  mocks.guardedDelete.mockResolvedValue(null);
});
describe("new pending-money writes", () => {
  it("binds creates to the budget being viewed", async () => {
    const response = await POST(
      request("POST", {
        description: "Check",
        amount: 20,
        expectedBudgetId: 28,
      }),
    );
    expect(response.status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("strips scope metadata and preserves classic create compatibility", async () => {
    expect(
      (
        await POST(
          request("POST", {
            description: "Check",
            amount: 20,
            expectedBudgetId: 27,
          }),
        )
      ).status,
    ).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith({
      description: "Check",
      amount: 20,
      type: "expense",
    });
  });
  it("never falls back to legacy updates after a guarded conflict", async () => {
    mocks.guarded.mockResolvedValue(new Response("{}", { status: 409 }));
    const body = {
      amount: 20,
      expectedRevision: "00000000-0000-4000-8000-000000000001",
      expectedBudgetId: 27,
    };
    expect((await PATCH(request("PATCH", body), params)).status).toBe(409);
    expect(mocks.guarded).toHaveBeenCalledWith("pending_checks", 1, body);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("uses revision-checked removal for clearing", async () => {
    mocks.guardedDelete.mockResolvedValue(new Response("{}", { status: 409 }));
    expect((await DELETE(request("DELETE", {}), params)).status).toBe(409);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("keeps classic updates working", async () => {
    expect((await PATCH(request("PATCH", { amount: 5 }), params)).status).toBe(
      200,
    );
    expect(mocks.update).toHaveBeenCalledWith(1, { amount: 5 });
  });
  it("rejects invalid edits and read-only access", async () => {
    expect((await PATCH(request("PATCH", { amount: -1 }), params)).status).toBe(
      400,
    );
    expect(mocks.update).not.toHaveBeenCalled();
    mocks.write.mockResolvedValue(new Response("{}", { status: 403 }));
    expect(
      (await POST(request("POST", { description: "Check", amount: 20 })))
        .status,
    ).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
