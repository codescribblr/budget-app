import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  auth: vi.fn(),
  account: vi.fn(),
  access: vi.fn(),
  approve: vi.fn(),
  query: vi.fn(),
  eq: vi.fn(),
}));
vi.mock("@/lib/supabase-queries", () => ({ getAuthenticatedUser: mock.auth }));
vi.mock("@/lib/account-context", () => ({ getActiveAccountId: mock.account }));
vi.mock("@/lib/api-helpers", () => ({ checkWriteAccess: mock.access }));
vi.mock("@/lib/automatic-imports/queue-manager", () => ({
  approveAndImportQueuedTransactions: mock.approve,
}));
vi.mock("@/lib/csv-parser-helpers", () => ({
  generateTransactionHash: () => "fallback",
}));
import { POST } from "../../../app/api/automatic-imports/queue/approve-batch/route";
const transaction = {
  id: "queued-10",
  date: "2026-10-27",
  description: "BANK TEXT",
  merchant: "Market",
  amount: 30,
  transaction_type: "expense",
  splits: [{ categoryId: 1, amount: 30 }],
  hash: "untrusted-client-hash",
  tag_ids: [4],
  is_historical: true,
};
const send = (changes = {}) =>
  POST(
    new Request("http://localhost/api/automatic-imports/queue/approve-batch", {
      method: "POST",
      body: JSON.stringify({
        batchId: "qa",
        transactions: [{ ...transaction, ...changes }],
      }),
    }),
  );
beforeEach(() => {
  vi.resetAllMocks();
  const query = {
    select: mock.query,
    in: mock.query,
    eq: mock.eq,
    single: vi.fn().mockResolvedValue({ data: null }),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({
        data: [{ id: 10, hash: "canonical-queue-hash" }],
      }).then(resolve),
  };
  mock.query.mockReturnValue(query);
  mock.eq.mockReturnValue(query);
  mock.auth.mockResolvedValue({ supabase: { from: () => query } });
  mock.account.mockResolvedValue(27);
  mock.access.mockResolvedValue(null);
  mock.approve.mockResolvedValue({ imported: 1 });
});
describe("queued mobile review payload", () => {
  it("retains canonical duplicate protection for ordinary imports and forwards review edits", async () => {
    expect((await send()).status).toBe(200);
    expect(mock.eq).toHaveBeenCalledWith("account_id", 27);
    expect(mock.approve).toHaveBeenCalledWith(
      [10],
      [
        expect.objectContaining({
          hash: "canonical-queue-hash",
          description: "BANK TEXT",
          tag_ids: [4],
          is_historical: true,
        }),
      ],
    );
  });
  it("uses a distinct canonical identity only on explicit override, stable on repeat submissions", async () => {
    await send({ forceImport: true });
    await send({ forceImport: true, hash: "a-different-client-hash" });
    const first = mock.approve.mock.calls[0][1][0];
    const second = mock.approve.mock.calls[1][1][0];
    expect(first.hash).toBe("canonical-queue-hash:separate:queued-10");
    expect(second.hash).toBe(first.hash);
    expect(first.description).toBe("BANK TEXT");
  });
  it("honors write permissions before processing a review", async () => {
    mock.access.mockResolvedValue(new Response(null, { status: 403 }));
    expect((await send()).status).toBe(403);
    expect(mock.approve).not.toHaveBeenCalled();
  });
});
