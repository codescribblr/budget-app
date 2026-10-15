import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  auth: vi.fn(),
  account: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  notify: vi.fn(),
  requireAdmin: vi.fn(),
  adminFrom: vi.fn(),
}));
vi.mock("next/server", async () => ({
  ...(await vi.importActual<typeof import("next/server")>("next/server")),
  after: mocks.after,
}));
vi.mock("@/lib/supabase-queries", () => ({ getAuthenticatedUser: mocks.auth }));
vi.mock("@/lib/account-context", () => ({ getActiveAccountId: mocks.account }));
vi.mock("@/lib/notifications/interface-feedback", () => ({
  notifyAdminsOfInterfaceFeedback: mocks.notify,
}));
vi.mock("@/lib/admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({ from: mocks.adminFrom }),
}));

import { POST } from "../../app/api/interface-feedback/route";
import { GET } from "../../app/api/admin/interface-feedback/route";

const input = {
  id: "1053c742-f00f-4b36-87c8-b5f1486ec690",
  kind: "suggestion",
  page: "/new/accounts",
  comment: "Please keep the balance fields easy to scan.",
};
const request = (body = input) =>
  new Request("http://localhost/api/interface-feedback", {
    method: "POST",
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({
    user: { id: "submitter", email: "submitter@example.com" },
    supabase: {
      from: () => ({ insert: mocks.insert, select: mocks.select }),
    },
  });
  mocks.account.mockResolvedValue(27);
  mocks.insert.mockResolvedValue({ error: null });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.single });
  mocks.notify.mockResolvedValue(undefined);
  mocks.requireAdmin.mockResolvedValue({ user: { id: "admin" } });
});

describe("feedback submission", () => {
  it("saves before scheduling admin alerts and includes authenticated context", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ saved: true });
    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.notify).not.toHaveBeenCalled();
    await mocks.after.mock.calls[0][0]();
    expect(mocks.notify).toHaveBeenCalledWith({
      ...input,
      userId: "submitter",
      submitterEmail: "submitter@example.com",
      accountId: 27,
    });
  });

  it("does not send another alert when the same submission is retried", async () => {
    mocks.insert.mockResolvedValue({ error: { code: "23505" } });
    mocks.single.mockResolvedValue({ data: { id: input.id } });
    expect((await POST(request())).status).toBe(200);
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "submitter");
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("never alerts for invalid input or failed saves", async () => {
    expect((await POST(request({ ...input, comment: "no" }))).status).toBe(400);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.insert.mockResolvedValue({ error: { code: "42501" } });
    expect((await POST(request())).status).toBe(503);
    expect(mocks.after).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("keeps feedback saved if background alert delivery fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.notify.mockRejectedValue(new Error("Email unavailable"));
    expect((await POST(request())).status).toBe(201);
    await expect(mocks.after.mock.calls[0][0]()).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("rejects unauthenticated feedback without saving or scheduling alerts", async () => {
    mocks.auth.mockRejectedValue(new Error("Unauthorized"));
    expect((await POST(request())).status).toBe(401);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.after).not.toHaveBeenCalled();
  });
});

describe("admin feedback deep links", () => {
  it("loads the linked submission independently of the recent 200 limit", async () => {
    const eq = vi.fn().mockResolvedValue({ data: [input], error: null });
    const limit = vi.fn();
    mocks.adminFrom.mockReturnValue({
      select: () => ({ order: () => ({ eq, limit }) }),
    });
    const response = await GET(
      new Request(
        `https://budget.example.com/api/admin/interface-feedback?feedback=${input.id}`,
      ),
    );
    expect(response.status).toBe(200);
    expect(eq).toHaveBeenCalledWith("id", input.id);
    expect(limit).not.toHaveBeenCalled();
  });

  it("requires admin access even when the feedback ID is known", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("Unauthorized"));
    expect(
      (
        await GET(
          new Request(
            `https://budget.example.com/api/admin/interface-feedback?feedback=${input.id}`,
          ),
        )
      ).status,
    ).toBe(403);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it("rejects malformed feedback links", async () => {
    expect(
      (
        await GET(
          new Request(
            "https://budget.example.com/api/admin/interface-feedback?feedback=invalid",
          ),
        )
      ).status,
    ).toBe(400);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });
});
