import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  auth: vi.fn(),
  account: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  in: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
}));
vi.mock("@/lib/supabase-queries", () => ({ getAuthenticatedUser: mock.auth }));
vi.mock("@/lib/account-context", () => ({ getActiveAccountId: mock.account }));
vi.mock("@/lib/csv-parser", () => ({ generateTransactionHash: vi.fn() }));
import { getQueuedImportBatches } from "@/lib/automatic-imports/queue-manager";
beforeEach(() => {
  vi.resetAllMocks();
  const query = {
    select: mock.select,
    eq: mock.eq,
    in: mock.in,
    order: mock.order,
    range: mock.range,
  };
  for (const fn of [mock.select, mock.eq, mock.in, mock.order])
    fn.mockReturnValue(query);
  mock.auth.mockResolvedValue({ supabase: { from: () => query } });
  mock.account.mockResolvedValue(27);
});
const row = (id: number, batch = "large") => ({
  id,
  source_batch_id: batch,
  transaction_date: "2026-10-27",
  source_fetched_at: "2026-10-27T12:00:00Z",
  status: "reviewing",
  original_data: { isDuplicate: true, duplicateType: "database" },
  automatic_import_setups: {
    source_type: "manual",
    integration_name: "Test upload",
  },
});
describe("batch list duplicate counts", () => {
  it("counts the entire account-scoped queue across pages, separately for each batch", async () => {
    mock.range
      .mockResolvedValueOnce({
        data: Array.from({ length: 1000 }, (_, i) => row(i)),
      })
      .mockResolvedValueOnce({
        data: [
          row(1000),
          { ...row(1001, "mixed"), original_data: { isDuplicate: false } },
          row(1002, "mixed"),
        ],
      });
    const batches = await getQueuedImportBatches();
    expect(mock.eq).toHaveBeenCalledWith("account_id", 27);
    expect(mock.in).toHaveBeenCalledWith("status", ["pending", "reviewing"]);
    expect(mock.range.mock.calls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(batches.find((b) => b.batch_id === "large")).toMatchObject({
      count: 1001,
      duplicates: { total: 1001, database: 1001, all_duplicates: true },
    });
    expect(batches.find((b) => b.batch_id === "mixed")).toMatchObject({
      count: 2,
      duplicates: { total: 1, all_duplicates: false },
    });
  });
  it("keeps the stored filename even if the batch's metadata row is not first", async () => {
    mock.range.mockResolvedValue({
      data: [row(2), { ...row(1), csv_file_name: "actual-bank-statement.csv" }],
    });
    expect((await getQueuedImportBatches())[0].file_name).toBe(
      "actual-bank-statement.csv",
    );
  });
  it("does not query without an active budget account", async () => {
    mock.account.mockResolvedValue(null);
    await expect(getQueuedImportBatches()).rejects.toThrow("No active account");
    expect(mock.select).not.toHaveBeenCalled();
  });
});
