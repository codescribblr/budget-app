import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  auth: vi.fn(),
  account: vi.fn(),
  access: vi.fn(),
  persist: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}));
vi.mock("@/lib/supabase-queries", () => ({ getAuthenticatedUser: mock.auth }));
vi.mock("@/lib/account-context", () => ({ getActiveAccountId: mock.account }));
vi.mock("@/lib/api-helpers", () => ({ checkWriteAccess: mock.access }));
vi.mock("@/lib/processing-tasks-server", () => ({
  persistCompletedTasks: mock.persist,
}));
import { POST } from "../../../app/api/automatic-imports/queue/update-categorization/route";
const body = {
  batchId: "batch",
  completedTasks: ["duplicate_detection"],
  transactions: [
    {
      id: "queued-1",
      splits: [],
      isDuplicate: true,
      duplicateType: "database",
      originalData: "{}",
    },
  ],
};
const send = (value = body) =>
  POST(
    new Request(
      "http://localhost/api/automatic-imports/queue/update-categorization",
      { method: "POST", body: JSON.stringify(value) },
    ),
  );
beforeEach(() => {
  vi.resetAllMocks();
  mock.auth.mockResolvedValue({
    supabase: { from: () => ({ update: mock.update }) },
  });
  mock.account.mockResolvedValue(27);
  mock.access.mockResolvedValue(null);
  const query = { eq: mock.eq, select: mock.select };
  mock.update.mockReturnValue(query);
  mock.eq.mockReturnValue(query);
  mock.select.mockResolvedValue({ data: [{ id: 1 }], error: null });
  mock.persist.mockResolvedValue(undefined);
});
describe("saved processing checkpoints", () => {
  it("scopes results to the account and batch and marks completion after results save", async () => {
    expect((await send()).status).toBe(200);
    expect(mock.eq).toHaveBeenCalledWith("account_id", 27);
    expect(mock.eq).toHaveBeenCalledWith("source_batch_id", "batch");
    expect(mock.persist).toHaveBeenCalledWith(expect.anything(), 27, "batch", [
      "duplicate_detection",
    ]);
    expect(mock.select.mock.invocationCallOrder[0]).toBeLessThan(
      mock.persist.mock.invocationCallOrder[0],
    );
  });
  it("does not report success or checkpoint a failed row write", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mock.select.mockResolvedValue({
      data: null,
      error: { message: "offline" },
    });
    expect((await send()).status).toBe(500);
    expect(mock.persist).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it("fails if a row is missing or belongs to another batch", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mock.select.mockResolvedValue({ data: [], error: null });
    expect((await send()).status).toBe(500);
    expect(mock.persist).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it("propagates checkpoint persistence failures instead of claiming readiness", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mock.persist.mockRejectedValue(new Error("checkpoint failed"));
    expect((await send()).status).toBe(500);
    log.mockRestore();
  });
  it("rejects unrelated completion flags", async () => {
    expect(
      (await send({ ...body, completedTasks: ["csv_mapping"] })).status,
    ).toBe(400);
    expect(mock.update).not.toHaveBeenCalled();
  });
});
