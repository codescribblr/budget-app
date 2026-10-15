import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { persistCompletedTasks } from "../../processing-tasks-server";

describe("processing task concurrency", () => {
  it("merges a concurrent completed step after a compare-and-set conflict", async () => {
    const snapshots = [
      {
        id: 4,
        processing_tasks: { duplicate_detection: false, categorization: false },
      },
      {
        id: 4,
        processing_tasks: { duplicate_detection: false, categorization: true },
      },
    ];
    const written: unknown[] = [];
    let writes = 0;
    const query: any = {};
    for (const method of ["eq", "is", "order", "limit"])
      query[method] = vi.fn(() => query);
    query.select = vi.fn(() => query);
    query.single = vi.fn(async () => ({
      data: snapshots.shift(),
      error: null,
    }));
    const client = {
      from: () => ({
        select: () => query,
        update: (value: unknown) => {
          written.push(value);
          const mutation: any = {
            eq: () => mutation,
            is: () => mutation,
            select: async () => ({
              data: writes++ ? [{ id: 4 }] : [],
              error: null,
            }),
          };
          return mutation;
        },
      }),
    } as unknown as SupabaseClient;
    await persistCompletedTasks(client, 27, "batch", ["duplicate_detection"]);
    expect(written).toEqual([
      {
        processing_tasks: { duplicate_detection: true, categorization: false },
      },
      { processing_tasks: { duplicate_detection: true, categorization: true } },
    ]);
  });
  it("does not fabricate a checkpoint if the batch cannot be read", async () => {
    const query: any = {};
    for (const method of ["select", "eq", "order", "limit"])
      query[method] = () => query;
    query.single = async () => ({ data: null, error: { message: "offline" } });
    const client = { from: () => query } as unknown as SupabaseClient;
    await expect(
      persistCompletedTasks(client, 27, "batch", ["categorization"]),
    ).rejects.toThrow("Could not load");
  });
});
