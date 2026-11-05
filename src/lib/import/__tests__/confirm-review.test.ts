import { describe, expect, it, vi } from "vitest";
import type { ParsedTransaction } from "@/lib/import-types";
import { categoryReviewSaveRow, confirmImportReview } from "../confirm-review";
import {
  aiEligible,
  assignReviewEnvelope,
  categorizationBucket,
  canImportTransaction,
  needsCategoryConfirmation,
  reviewPatch,
  type CategorySuggestion,
} from "../categorization";

const transaction = (
  id = 1,
  changes: Partial<ParsedTransaction> = {},
): ParsedTransaction => ({
  id: `queued-${id}`,
  revision: `original-${id}`,
  budgetId: 27,
  date: "2026-11-04",
  merchant: "Market",
  description: "Market purchase",
  amount: 20,
  transaction_type: "expense",
  hash: `hash-${id}`,
  originalData: "{}",
  status: "pending",
  isDuplicate: false,
  account_id: 4,
  tag_ids: [9],
  is_historical: true,
  splits: [{ categoryId: 1, categoryName: "Food", amount: 20 }],
  ...changes,
});
const reviewed = (t: ParsedTransaction): ParsedTransaction => ({
  ...t,
  revision: `saved-${t.id}`,
  categoryReview: {
    state: "reviewed",
    merchant: t.merchant,
    forceImport: !!t.forceImport,
    patch: reviewPatch(t),
    suggestion: t.categorization,
  },
});
const suggestion = (source: "ai" | "history", alwaysAsk = false) =>
  ({
    source,
    outcome: "suggest",
    categoryId: 1,
    alwaysAsk,
  }) as CategorySuggestion;

describe("final import confirmation", () => {
  it("keeps eligible history/AI suggestions in Needs review until final confirmation", () => {
    for (const source of ["ai", "history"] as const) {
      const t = transaction(1, { categorization: suggestion(source) });
      expect(categorizationBucket(t)).toBe("attention");
      expect(canImportTransaction(t)).toBe(true);
      expect(categorizationBucket(reviewed(t))).toBe("ready");
      expect(needsCategoryConfirmation(t)).toBe(true);
      expect(needsCategoryConfirmation(reviewed(t))).toBe(false);
      expect(aiEligible(t)).toBe(true);
    }
    expect(
      needsCategoryConfirmation(
        transaction(1, { categorization: suggestion("history", true) }),
      ),
    ).toBe(true);
    expect(
      needsCategoryConfirmation(
        transaction(1, {
          categorization: { ...suggestion("history"), outcome: "auto" },
        }),
      ),
    ).toBe(true);
  });
  it("saves the same decision as selecting the suggested envelope individually", () => {
    const t = transaction();
    const chosen = assignReviewEnvelope(t, { id: 1, name: "Food" });
    expect(categoryReviewSaveRow(t)).toEqual(categoryReviewSaveRow(chosen));
    expect(categoryReviewSaveRow(t)).toMatchObject({
      revision: "original-1",
      state: "reviewed",
      patch: {
        account_id: 4,
        tag_ids: [9],
        is_historical: true,
        splits: [{ category_id: 1, amount: 20 }],
      },
    });
  });
  it("imports confirmed rows and suggestions with the revisions returned by saving, excluding unsafe rows", async () => {
    const first = transaction(1, { categorization: suggestion("history") });
    const second = reviewed(transaction(2));
    const save = vi.fn(async (rows: ParsedTransaction[]) => rows.map(reviewed));
    const approve = vi.fn(async () => ({ imported: 2 }));
    const rows = [
      first,
      second,
      transaction(3, { isDuplicate: true }),
      transaction(4, { reviewSkipped: true }),
      transaction(5, { splits: [] }),
      transaction(6, { date: "2026-02-30" }),
      transaction(7, {
        splits: [{ categoryId: 1, categoryName: "Food", amount: 10 }],
      }),
    ];
    await expect(confirmImportReview(rows, save, approve)).resolves.toEqual({
      imported: 2,
    });
    expect(save).toHaveBeenCalledExactlyOnceWith([first]);
    expect(approve).toHaveBeenCalledExactlyOnceWith([reviewed(first), second]);
    expect(first.revision).toBe("original-1");
    expect(first.categoryReview).toBeUndefined();
  });
  it("supports more than 100 suggestions and imports only after all confirmations finish", async () => {
    const rows = Array.from({ length: 205 }, (_, i) => transaction(i + 1));
    const approve = vi.fn(
      async (confirmed: ParsedTransaction[]) => confirmed.length,
    );
    const save = vi.fn(async (chunk: ParsedTransaction[]) => {
      expect(approve).not.toHaveBeenCalled();
      return chunk.map(reviewed);
    });
    expect(await confirmImportReview(rows, save, approve)).toBe(205);
    expect(save.mock.calls.map(([chunk]) => chunk.length)).toEqual([
      100, 100, 5,
    ]);
    expect(approve.mock.calls[0][0].map((t) => t.id)).toEqual(
      rows.map((t) => t.id),
    );
  });
  it("does not import when a suggestion changed elsewhere, and resumes already saved chunks", async () => {
    const rows = Array.from({ length: 101 }, (_, i) => transaction(i + 1));
    const save = vi
      .fn()
      .mockImplementationOnce(async (chunk: ParsedTransaction[]) =>
        chunk.map(reviewed),
      )
      .mockRejectedValueOnce(new Error("Changed elsewhere"));
    const approve = vi.fn();
    await expect(confirmImportReview(rows, save, approve)).rejects.toThrow(
      "Changed elsewhere",
    );
    expect(approve).not.toHaveBeenCalled();
    const retrySave = vi.fn(async (chunk: ParsedTransaction[]) =>
      chunk.map(reviewed),
    );
    await confirmImportReview(
      [...rows.slice(0, 100).map(reviewed), rows[100]],
      retrySave,
      approve,
    );
    expect(retrySave).toHaveBeenCalledExactlyOnceWith([rows[100]]);
    expect(approve.mock.calls[0][0]).toHaveLength(101);
  });
  it("never imports an incomplete confirmation response", async () => {
    const approve = vi.fn();
    await expect(
      confirmImportReview([transaction()], async () => [], approve),
    ).rejects.toThrow("Could not confirm every choice");
    expect(approve).not.toHaveBeenCalled();
  });
  it("keeps confirmed choices on an import failure so retry does not confirm them again", async () => {
    const t = transaction();
    const save = vi.fn(async (chunk: ParsedTransaction[]) =>
      chunk.map(reviewed),
    );
    await expect(
      confirmImportReview([t], save, async () => {
        throw new Error("Lost response");
      }),
    ).rejects.toThrow("Lost response");
    save.mockClear();
    const approve = vi.fn(async () => ({ skipped: 1 }));
    await confirmImportReview([reviewed(t)], save, approve);
    expect(save).not.toHaveBeenCalled();
    expect(approve).toHaveBeenCalledExactlyOnceWith([reviewed(t)]);
  });
  it("never automatically includes duplicates, skipped rows, or missing envelopes", async () => {
    const save = vi.fn();
    const approve = vi.fn();
    await expect(
      confirmImportReview(
        [
          transaction(1, { duplicateType: "within-file" }),
          transaction(2, { reviewSkipped: true }),
          transaction(3, { splits: [] }),
        ],
        save,
        approve,
      ),
    ).rejects.toThrow("Choose an envelope");
    expect(save).not.toHaveBeenCalled();
    expect(approve).not.toHaveBeenCalled();
  });
});
