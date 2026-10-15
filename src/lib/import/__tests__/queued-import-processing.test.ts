import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prepareQueuedImport } from "../queued-import-processing";
import type { ProcessingTasksStatus } from "../../processing-tasks";

let tasks: ProcessingTasksStatus | null;
let rows: Record<string, any>[];
let duplicateHashes: string[];
let failedPath: string | null;
let failedStep: string | null;
let events: string[];
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });

beforeEach(() => {
  tasks = {
    csv_mapping: true,
    duplicate_detection: false,
    categorization: false,
    import_defaults_assignment: false,
  };
  rows = [
    {
      id: 1,
      transaction_date: "2026-10-15",
      description: "Test cafe",
      merchant: "Test cafe",
      amount: 12,
      transaction_type: "expense",
      hash: "hash1",
      original_data: {},
      suggested_category_id: null,
      tag_ids: [9],
    },
  ];
  duplicateHashes = [];
  failedPath = null;
  failedStep = null;
  events = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, options?: RequestInit) => {
      const body = options?.body ? JSON.parse(String(options.body)) : {};
      if (url.includes("processing-status"))
        return response({
          processingTasks: tasks,
          defaultAccountId: null,
          defaultCreditCardId: null,
          isHistorical: false,
        });
      if (url.includes("/queue?")) return response({ imports: rows });
      events.push(url);
      if (url === failedPath) return response({ error: "Unavailable" }, 503);
      if (url === "/api/import/check-duplicates") {
        expect(body.batchId).toBeUndefined(); // A calculation cannot mark unsaved results complete.
        return response({ duplicates: duplicateHashes });
      }
      if (url === "/api/import/link-merchants") return response({ linked: 0 });
      if (url === "/api/categories") return response([{ id: 7, name: "Food" }]);
      if (url === "/api/categorize") {
        expect(body.batchId).toBeUndefined();
        return response({ suggestions: [{ categoryId: 7 }] });
      }
      if (url.includes("mark-task-complete")) {
        tasks![body.task as keyof ProcessingTasksStatus] = true;
        return response({ success: true });
      }
      if (url === "/api/automatic-imports/queue/update-categorization") {
        const task = body.completedTasks[0];
        events.push("save:" + task);
        if (task === failedStep)
          return response({ error: "Checkpoint failed" }, 500);
        rows = body.transactions.map((t: any, index: number) => ({
          ...rows[index],
          suggested_category_id: t.splits[0]?.categoryId ?? null,
          original_data: {
            isDuplicate: t.isDuplicate,
            duplicateType: t.duplicateType,
          },
        }));
        tasks![task as keyof ProcessingTasksStatus] = true;
        return response({ success: true });
      }
      throw new Error("Unexpected request: " + url);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());
const run = () => prepareQueuedImport("test-batch", vi.fn());
const count = (path: string) => events.filter((event) => event === path).length;

describe("queued import checkpoints", () => {
  it("shares overlapping starts and saves each step before advancing", async () => {
    const [first, second] = await Promise.all([run(), run()]);
    expect(first).toBe(second);
    expect(count("/api/import/check-duplicates")).toBe(1);
    expect(count("/api/categorize")).toBe(1);
    expect(events.indexOf("save:duplicate_detection")).toBeLessThan(
      events.indexOf("/api/categorize"),
    );
    expect(tasks).toMatchObject({
      duplicate_detection: true,
      categorization: true,
      import_defaults_assignment: false,
    });
    expect(first.transactions[0].tag_ids).toEqual([9]);
    await run(); // Opening the dialog again does not repeat completed work.
    expect(count("/api/import/check-duplicates")).toBe(1);
    expect(count("/api/categorize")).toBe(1);
  });
  it("finishes categorization for an all-duplicate batch without categorizing duplicates", async () => {
    duplicateHashes = ["hash1"];
    const result = await run();
    expect(result.transactions[0].isDuplicate).toBe(true);
    expect(tasks?.categorization).toBe(true);
    expect(count("/api/categorize")).toBe(0);
    await run();
    expect(count("/api/import/check-duplicates")).toBe(1);
  });
  it("resumes after interruption without rerunning the saved duplicate step", async () => {
    failedPath = "/api/categorize";
    await expect(run()).rejects.toThrow("Could not categorize");
    expect(tasks).toMatchObject({
      duplicate_detection: true,
      categorization: false,
    });
    failedPath = null;
    await run();
    expect(count("/api/import/check-duplicates")).toBe(1);
    expect(count("/api/categorize")).toBe(2);
    expect(tasks?.categorization).toBe(true);
  });
  it("does not advance or claim success when checkpoint persistence fails", async () => {
    failedStep = "duplicate_detection";
    await expect(run()).rejects.toThrow("Checkpoint failed");
    expect(tasks?.duplicate_detection).toBe(false);
    expect(count("/api/categorize")).toBe(0);
    failedStep = null;
    await run();
    expect(tasks?.categorization).toBe(true);
  });
  it("does not record a failed duplicate request as complete", async () => {
    failedPath = "/api/import/check-duplicates";
    await expect(run()).rejects.toThrow("Could not check duplicates");
    expect(count("save:duplicate_detection")).toBe(0);
    expect(tasks?.duplicate_detection).toBe(false);
  });
  it("only shows settings when automatic work is already complete", async () => {
    tasks!.duplicate_detection = true;
    tasks!.categorization = true;
    await run();
    expect(events).toEqual([]);
  });
  it("leaves legacy batches without metadata reviewable and skips non-applicable tasks", async () => {
    tasks = null;
    await run();
    expect(events).toEqual([]);
    tasks = { categorization: false };
    await run();
    expect(count("/api/import/check-duplicates")).toBe(0);
    expect(count("/api/categorize")).toBe(1);
  });
  it("repairs old PDF conversion flags using the already-converted queued rows", async () => {
    tasks!.pdf_to_csv = false;
    await run();
    expect(tasks?.pdf_to_csv).toBe(true);
    expect(tasks?.categorization).toBe(true);
  });
});
