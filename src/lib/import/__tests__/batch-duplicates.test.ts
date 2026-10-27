import { describe, expect, it } from "vitest";
import { summarizeBatchDuplicates } from "../batch-duplicates";
const row = (
  data: unknown,
  processing_tasks?: unknown,
  status = "reviewing",
) => ({ original_data: data, processing_tasks, status });
const existing = () => row({ isDuplicate: true, duplicateType: "database" });
const repeat = () => row({ isDuplicate: true, duplicateType: "within-file" });
const unique = () => row({ isDuplicate: false, duplicateType: null });

describe("queued batch duplicate summaries", () => {
  it("counts duplicate rows once and keeps existing imports separate from possible in-file repeats", () => {
    expect(
      summarizeBatchDuplicates([
        existing(),
        repeat(),
        unique(),
        row({ isDuplicate: true }),
      ]),
    ).toEqual({
      total: 3,
      database: 1,
      within_file: 1,
      unclassified: 1,
      check_complete: true,
      all_duplicates: false,
    });
  });
  it("supports JSON-string metadata and type flags used by the review screen", () => {
    expect(
      summarizeBatchDuplicates([
        row(JSON.stringify({ duplicateType: "database" })),
        row({ isDuplicate: false, duplicateType: "within-file" }),
      ]),
    ).toMatchObject({
      total: 2,
      database: 1,
      within_file: 1,
      all_duplicates: true,
    });
  });
  it("marks a remaining batch as all duplicates after the non-duplicates were imported, even without its original checkpoint row", () => {
    expect(
      summarizeBatchDuplicates([unique(), existing(), existing()])
        .all_duplicates,
    ).toBe(false);
    expect(summarizeBatchDuplicates([existing(), existing()])).toMatchObject({
      total: 2,
      all_duplicates: true,
    });
  });
  it("does not call unfinished or restarted checks duplicate-only, even if old flags remain", () => {
    expect(
      summarizeBatchDuplicates([
        row(
          { isDuplicate: true, duplicateType: "database" },
          { duplicate_detection: false },
        ),
        existing(),
      ]),
    ).toMatchObject({ total: 2, check_complete: false, all_duplicates: false });
  });
  it("reads the checkpoint stored on just one row and distinguishes a completed zero from an unchecked zero", () => {
    expect(
      summarizeBatchDuplicates([
        row({}, { duplicate_detection: true }),
        row({}),
      ]),
    ).toMatchObject({ total: 0, check_complete: true });
    expect(summarizeBatchDuplicates([row({}), row({})])).toMatchObject({
      total: 0,
      check_complete: false,
    });
  });
  it("does not inherit an old check for newly appended pending rows", () => {
    expect(
      summarizeBatchDuplicates([
        row({ isDuplicate: true }, { duplicate_detection: true }),
        row({}, null, "pending"),
      ]),
    ).toMatchObject({ total: 1, check_complete: false, all_duplicates: false });
  });
  it("tolerates malformed metadata and empty queues without claiming completion", () => {
    for (const data of ["not json", "null", [], null, false])
      expect(summarizeBatchDuplicates([row(data)])).toMatchObject({
        total: 0,
        check_complete: false,
        all_duplicates: false,
      });
    expect(summarizeBatchDuplicates([])).toMatchObject({
      total: 0,
      check_complete: false,
      all_duplicates: false,
    });
  });
});
