import { beforeEach, describe, it, expect, vi } from "vitest";
const mock = vi.hoisted(() => ({
  access: vi.fn(),
  active: vi.fn(),
  rpc: vi.fn(),
  premium: vi.fn(),
}));
vi.mock("@/lib/api-helpers", () => ({ checkWriteAccess: mock.access }));
vi.mock("@/lib/account-context", () => ({ getActiveAccountId: mock.active }));
vi.mock("@/lib/supabase-queries", () => ({
  getAuthenticatedUser: async () => ({ supabase: { rpc: mock.rpc } }),
}));
vi.mock("@/lib/subscription-utils", () => ({
  requirePremiumSubscription: mock.premium,
  PremiumRequiredError: class extends Error {},
}));
import { housekeepingWrite } from "../housekeeping-route";
const body = () => ({
  expectedBudgetId: 27,
  operationId: crypto.randomUUID(),
  command: {
    action: "archive",
    records: [{ id: 1, revision: crypto.randomUUID() }],
  },
});
const req = (data: unknown) =>
  new Request("http://localhost/api/categories/housekeeping", {
    method: "POST",
    body: JSON.stringify(data),
  });
beforeEach(() => {
  vi.resetAllMocks();
  mock.access.mockResolvedValue(null);
  mock.active.mockResolvedValue(27);
  mock.rpc.mockResolvedValue({
    data: { status: "saved", count: 1 },
    error: null,
  });
});
describe("housekeeping endpoint", () => {
  it("passes the reviewed command unchanged to the atomic function", async () => {
    const data = body();
    expect((await housekeepingWrite(req(data), "envelopes")).status).toBe(200);
    expect(mock.rpc).toHaveBeenCalledWith("manage_envelopes", {
      p_budget_id: 27,
      p_operation_id: data.operationId,
      p_command: data.command,
    });
  });
  it("checks active budget and edit access before writing", async () => {
    expect(
      (
        await housekeepingWrite(
          req({ ...body(), expectedBudgetId: 28 }),
          "envelopes",
        )
      ).status,
    ).toBe(409);
    mock.access.mockResolvedValue(new Response(null, { status: 403 }));
    expect((await housekeepingWrite(req(body()), "envelopes")).status).toBe(
      403,
    );
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("rejects malformed commands without writing", async () => {
    expect(
      (
        await housekeepingWrite(
          req({ ...body(), command: { action: "delete", records: [] } }),
          "envelopes",
        )
      ).status,
    ).toBe(400);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("requires explicit review after a source or selection conflict", async () => {
    mock.rpc.mockResolvedValue({ data: { status: "conflict" }, error: null });
    const res = await housekeepingWrite(req(body()), "envelopes");
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "STALE_RECORD" });
  });
  it.each(["22023", "42501", "23503"])(
    "returns database rejection %s safely",
    async (code) => {
      mock.rpc.mockResolvedValue({
        error: { code, message: "Cannot archive this envelope" },
      });
      expect((await housekeepingWrite(req(body()), "envelopes")).status).toBe(
        code === "42501" ? 403 : 400,
      );
    },
  );
  it("checks premium for goal actions", async () => {
    const data = {
      ...body(),
      command: {
        action: "delete",
        id: 3,
        revision: crypto.randomUUID(),
        sourceRevisions: {},
      },
    };
    expect((await housekeepingWrite(req(data), "goal")).status).toBe(200);
    expect(mock.premium).toHaveBeenCalledWith(27);
  });
});
