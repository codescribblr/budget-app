import { describe, expect, it } from "vitest";
import {
  buildHistory,
  assignReviewEnvelope,
  combineSuggestions,
  categorizationBucket,
  aiEligible,
  hydrateCategoryReview,
  reviewPatch,
  type CategorySuggestion,
  type HistoryObservation,
} from "../categorization";
import type { ParsedTransaction } from "@/lib/import-types";
const now = new Date("2026-11-02T12:00:00Z");
const entry = (
  i: number,
  categoryId = 1,
  changes: Partial<HistoryObservation> = {},
): HistoryObservation => ({
  id: i,
  date: `2026-10-${String(30 - i).padStart(2, "0")}`,
  description: "QT",
  amount: 30,
  transaction_type: "expense",
  confirmed: true,
  session: i > 10 ? "batch-2" : "batch-1",
  corrected: false,
  splits: [
    {
      categoryId,
      categoryName: categoryId === 1 ? "Food" : "Fuel",
      amount: 30,
    },
  ],
  ...changes,
});
const history = (entries: HistoryObservation[]) =>
  buildHistory(entries, "expense", new Set([1, 2]), now);
const suggestion = (
  entries: HistoryObservation[] = [],
): CategorySuggestion => ({
  version: 1,
  fingerprint: "abc",
  merchantId: 1,
  merchantName: "QT",
  historyVersion: "v1",
  generatedAt: now.toISOString(),
  alwaysAsk: false,
  history: history(entries),
  outcome: "ask",
  source: null,
  categoryId: null,
  reason: "",
});
const tx = (changes: Partial<ParsedTransaction> = {}): ParsedTransaction => ({
  id: "queued-1",
  budgetId: 27,
  revision: "r1",
  date: "2026-10-30",
  description: "QT STORE 1",
  merchant: "QT",
  amount: 30,
  transaction_type: "expense",
  originalData: "{}",
  hash: "bank-hash",
  isDuplicate: false,
  status: "pending",
  splits: [{ categoryId: 1, categoryName: "Food", amount: 30 }],
  ...changes,
});
describe("history categorization evidence", () => {
  it("does not confuse repeated use with reliable evidence", () => {
    const small = history([entry(1), entry(2)]);
    expect(small.candidates[0].categoryId).toBe(1);
    expect(small.eligible).toBe(false);
    const mixed = history(
      Array.from({ length: 20 }, (_, i) => entry(i, i < 14 ? 1 : 2)),
    );
    expect(mixed.eligible).toBe(false);
    expect(mixed.candidates.map((c) => c.count)).toEqual([14, 6]);
  });
  it("keeps legacy history useful without calling it confirmed", () => {
    const h = history(
      Array.from({ length: 24 }, (_, i) => entry(i, 1, { confirmed: false })),
    );
    expect(h.confirmedCount).toBe(0);
    expect(h.otherCount).toBe(24);
    expect(h.eligible).toBe(false);
    expect(h.candidates[0].categoryId).toBe(1);
  });
  it("deduplicates transactions and counts a split as one mixed observation", () => {
    const a = entry(1, 1, {
      splits: [
        { categoryId: 1, categoryName: "Food", amount: 10 },
        { categoryId: 2, categoryName: "Fuel", amount: 20 },
      ],
    });
    const h = history([a, a]);
    expect(h.confirmedCount).toBe(1);
    expect(h.splitCount).toBe(1);
    expect(h.candidates.every((c) => c.count === 0)).toBe(true);
  });
  it("requires enough recent history across dates and sessions and demotes corrections", () => {
    const rows = Array.from({ length: 24 }, (_, i) => entry(i));
    expect(history(rows).eligible).toBe(true);
    expect(history(rows.map((t) => ({ ...t, session: "same" }))).eligible).toBe(
      false,
    );
    expect(
      history(rows.map((t) => ({ ...t, date: "2025-01-01" }))).eligible,
    ).toBe(false);
    expect(
      history(rows.map((t, i) => ({ ...t, corrected: i === 0 }))).eligible,
    ).toBe(false);
  });
  it("separates refunds from expenses and excludes unavailable envelopes", () => {
    expect(
      buildHistory([entry(1)], "income", new Set([1]), now).candidates,
    ).toHaveLength(0);
    expect(
      buildHistory([entry(1)], "expense", new Set([2]), now).candidates,
    ).toHaveLength(0);
  });
});
describe("AI and history work together", () => {
  const ai = {
    state: "complete" as const,
    candidate: {
      categoryId: 2,
      categoryName: "Fuel",
      reason: "Pump descriptor",
    },
    reason: "The bank description says AT PUMP.",
    confidence: 0.99,
    model: "model",
    promptVersion: "v1",
  };
  it("offers AI with sparse history but does not certify model confidence", () => {
    const result = combineSuggestions({ ...suggestion(), ai });
    expect(result.categoryId).toBe(2);
    expect(result.source).toBe("ai");
    expect(result.outcome).toBe("suggest");
  });
  it("makes disagreement explicit and never favors the legacy guess", () => {
    const result = combineSuggestions({ ...suggestion([entry(1)]), ai });
    expect(result.categoryId).toBeNull();
    expect(result.reason).toContain("different envelopes");
    expect(result.history.candidates[0].categoryId).toBe(1);
    expect(result.ai?.candidate?.categoryId).toBe(2);
  });
  it("does not count agreement as independent proof", () => {
    expect(
      combineSuggestions({ ...suggestion([entry(1, 2)]), ai }).outcome,
    ).toBe("suggest");
  });
  it("requires explicit rollout configuration and respects always ask", () => {
    const s = suggestion(Array.from({ length: 24 }, (_, i) => entry(i)));
    expect(combineSuggestions(s).outcome).toBe("suggest");
    expect(
      combineSuggestions(s, { history: true, ai: false, aiThreshold: 1 })
        .outcome,
    ).toBe("auto");
    expect(
      combineSuggestions(
        { ...s, alwaysAsk: true },
        { history: true, ai: true, aiThreshold: 0.9 },
      ).outcome,
    ).toBe("suggest");
  });
  it("keeps validated history eligible when optional AI agrees", () => {
    const s = suggestion(Array.from({ length: 24 }, (_, i) => entry(i, 2)));
    const result = combineSuggestions(
      { ...s, ai },
      { history: true, ai: false, aiThreshold: 1 },
    );
    expect(result.source).toBe("both");
    expect(result.automaticBasis).toBe("history");
    expect(result.outcome).toBe("auto");
  });
  it("allows separately validated AI cases without the history sample gate", () => {
    expect(
      combineSuggestions(
        { ...suggestion(), ai },
        { history: false, ai: true, aiThreshold: 0.95 },
      ).outcome,
    ).toBe("auto");
  });
});
describe("durable review state", () => {
  it("can leave out a purchase without choosing an envelope", () => {
    const skipped = tx({
      reviewSkipped: true,
      splits: [{ categoryId: 0, categoryName: "", amount: 30 }],
    });
    expect(reviewPatch(skipped).splits).toEqual([]);
    expect(categorizationBucket(skipped)).toBe("skipped");
  });
  it("keeps ready, attention, duplicates and left out exclusive", () => {
    expect(categorizationBucket(tx())).toBe("ready");
    expect(categorizationBucket(tx({ splits: [] }))).toBe("attention");
    expect(
      categorizationBucket(
        tx({ categorization: { ...suggestion(), outcome: "auto" } }),
      ),
    ).toBe("ready");
    expect(categorizationBucket(tx({ isDuplicate: true }))).toBe("duplicates");
    expect(categorizationBucket(tx({ reviewSkipped: true }))).toBe("skipped");
    expect(
      categorizationBucket(
        tx({
          date: "2026-02-30",
          categorization: { ...suggestion(), outcome: "auto" },
        }),
      ),
    ).toBe("attention");
  });
  it("AI includes weak prefilled guesses and excludes confirmed decisions unless selected explicitly", () => {
    const t = tx();
    expect(aiEligible(t)).toBe(true);
    const reviewed = tx({
      categoryReview: {
        state: "reviewed",
        patch: reviewPatch(t),
        merchant: t.merchant,
        forceImport: false,
      },
    });
    expect(aiEligible(reviewed)).toBe(false);
    expect(aiEligible(reviewed, true)).toBe(true);
    expect(aiEligible(tx({ reviewSkipped: true }), true)).toBe(false);
    expect(aiEligible(tx({ isDuplicate: true }), true)).toBe(false);
  });
  it("preserves full splits and a reviewed decision when a new AI alternative arrives", () => {
    const t = tx();
    const review = {
      state: "reviewed" as const,
      merchant: t.merchant,
      forceImport: false,
      patch: {
        ...reviewPatch(t),
        splits: [
          { category_id: 1, amount: 10 },
          { category_id: 2, amount: 20 },
        ],
      },
    };
    const result = hydrateCategoryReview(
      t,
      {
        category_review: review,
        category_suggestion: { ...suggestion(), categoryId: 2 },
      },
      [
        { id: 1, name: "Food" },
        { id: 2, name: "Fuel" },
      ],
    );
    expect(result.splits.map((s) => s.amount)).toEqual([10, 20]);
    expect(categorizationBucket(result)).toBe("ready");
    expect(result.hash).toBe("bank-hash");
  });
});

describe("two-click envelope review", () => {
  const food = { id: 1, name: "Food" };
  const fuel = { id: 2, name: "Fuel" };
  it("changes only the envelope and keeps the captured revision and bank identity", () => {
    const before = tx({
      account_id: 4,
      credit_card_id: null,
      tag_ids: [7, 8],
      is_historical: true,
    });
    const after = assignReviewEnvelope(before, fuel);
    expect(after).toEqual({
      ...before,
      reviewSkipped: false,
      splits: [{ categoryId: 2, categoryName: "Fuel", amount: 30 }],
    });
    expect(before.splits[0].categoryId).toBe(1);
    expect(after.revision).toBe("r1");
    expect(after.hash).toBe("bank-hash");
  });
  it("accepts the existing suggestion as an explicit saved review", () => {
    const choice = assignReviewEnvelope(tx(), food);
    const saved = hydrateCategoryReview(
      choice,
      {
        category_review: {
          state: "reviewed",
          patch: reviewPatch(choice),
          merchant: choice.merchant,
          forceImport: false,
        },
      },
      [food],
    );
    expect(categorizationBucket(saved)).toBe("ready");
  });
  it("allocates the entire refund and keeps its income direction", () => {
    const result = assignReviewEnvelope(
      tx({ transaction_type: "income", amount: 12.34, splits: [] }),
      fuel,
    );
    expect(result.transaction_type).toBe("income");
    expect(result.splits[0].amount).toBe(12.34);
  });
  it("never flattens a split or silently includes a duplicate", () => {
    expect(() =>
      assignReviewEnvelope(
        tx({
          splits: [
            { categoryId: 1, categoryName: "Food", amount: 10 },
            { categoryId: 2, categoryName: "Fuel", amount: 20 },
          ],
        }),
        food,
      ),
    ).toThrow("split editor");
    expect(() => assignReviewEnvelope(tx({ isDuplicate: true }), food)).toThrow(
      "duplicate",
    );
    expect(() =>
      assignReviewEnvelope(tx({ duplicateType: "within-file" }), food),
    ).toThrow("duplicate");
    expect(
      assignReviewEnvelope(tx({ isDuplicate: true, forceImport: true }), food)
        .forceImport,
    ).toBe(true);
  });
  it("can bring a deliberately left-out row back through explicit envelope selection", () => {
    const choice = assignReviewEnvelope(
      tx({ reviewSkipped: true, status: "excluded", splits: [] }),
      food,
    );
    expect(choice.reviewSkipped).toBe(false);
    expect(choice.status).toBe("pending");
    expect(choice.splits[0].amount).toBe(30);
  });
  it("requires correction of invalid details before marking ready", () => {
    expect(() =>
      assignReviewEnvelope(tx({ date: "2026-02-30" }), food),
    ).toThrow("valid transaction date");
    expect(() => assignReviewEnvelope(tx({ amount: 0 }), food)).toThrow(
      "amount greater than zero",
    );
    expect(() => assignReviewEnvelope(tx(), { id: 0, name: "" })).toThrow(
      "Choose an envelope",
    );
  });
});
