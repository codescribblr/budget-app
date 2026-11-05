import { reviewValidation } from "./mobile-review";
import type { ParsedTransaction, TransactionSplit } from "@/lib/import-types";

export const HISTORY_VERSION = "confirmed-history-v1";
export const AI_PROMPT_VERSION = "budget-context-v1";
export interface CategoryCandidate {
  categoryId: number;
  categoryName: string;
  count?: number;
  reason: string;
}
export interface HistoryObservation {
  id: number;
  date: string;
  description: string;
  amount: number;
  transaction_type: string;
  confirmed: boolean;
  session: string;
  corrected: boolean;
  confirmedAt?: string;
  splits: { categoryId: number; categoryName: string; amount: number }[];
}
export interface CategorySuggestion {
  version: 1;
  fingerprint: string;
  merchantId: number | null;
  merchantName: string;
  historyVersion: string;
  generatedAt: string;
  alwaysAsk: boolean;
  preferenceRevision?: string | null;
  history: {
    candidates: CategoryCandidate[];
    confirmedCount: number;
    otherCount: number;
    splitCount: number;
    recent: HistoryObservation[];
    eligible: boolean;
    reason: string;
  };
  ai?: {
    candidate: CategoryCandidate | null;
    reason: string;
    confidence: number;
    model: string;
    promptVersion: string;
    state: "complete" | "failed";
    error?: string;
  };
  outcome: "suggest" | "ask" | "auto";
  source: "history" | "ai" | "both" | null;
  automaticBasis?: "history" | "ai" | null;
  categoryId: number | null;
  reason: string;
}
export interface CategoryReview {
  state: "reviewed" | "skipped";
  actor?: string;
  savedAt?: string;
  patch: {
    date: string;
    description: string;
    total_amount: number;
    transaction_type: "income" | "expense";
    account_id: number | null;
    credit_card_id: number | null;
    is_historical: boolean;
    tag_ids: number[];
    splits: { category_id: number; amount: number }[];
  };
  merchant: string;
  forceImport: boolean;
  suggestion?: CategorySuggestion | null;
}
export type CategoryReviewBucket =
  "attention" | "ready" | "duplicates" | "skipped" | "all";
export function categorizationBucket(
  t: ParsedTransaction,
): Exclude<CategoryReviewBucket, "all"> {
  if ((t.isDuplicate || t.duplicateType) && !t.forceImport) return "duplicates";
  if (t.reviewSkipped || t.categoryReview?.state === "skipped")
    return "skipped";
  if (!canImportTransaction(t) || t.categoryReview?.state !== "reviewed")
    return "attention";
  return "ready";
}
/** Eligibility is independent of review: suggestions can be confirmed at import
 * while staying visible in Needs review until the user confirms them.
 */
export function canImportTransaction(t: ParsedTransaction): boolean {
  return (
    !((t.isDuplicate || t.duplicateType) && !t.forceImport) &&
    !t.reviewSkipped &&
    t.categoryReview?.state !== "skipped" &&
    !reviewValidation(t) &&
    validAllocation(t.splits, t.amount)
  );
}
export function needsCategoryConfirmation(t: ParsedTransaction) {
  return (
    canImportTransaction(t) &&
    t.categoryReview?.state !== "reviewed"
  );
}
export function validAllocation(splits: TransactionSplit[], amount: number) {
  return (
    splits.length > 0 &&
    splits.every(
      (s) =>
        Number.isSafeInteger(s.categoryId) &&
        s.categoryId > 0 &&
        Number.isFinite(s.amount) &&
        s.amount > 0 &&
        Math.abs(s.amount * 100 - Math.round(s.amount * 100)) < 0.00001,
    ) &&
    Math.round(splits.reduce((sum, s) => sum + s.amount, 0) * 100) ===
      Math.round(amount * 100)
  );
}
/** Quick review changes only the envelope. Keep the revision from when the picker opened. */
export function assignReviewEnvelope(
  transaction: ParsedTransaction,
  category: { id: number; name: string },
): ParsedTransaction {
  if (
    (transaction.isDuplicate || transaction.duplicateType) &&
    !transaction.forceImport
  )
    throw new Error("Review this duplicate before including it.");
  if (transaction.splits.length > 1)
    throw new Error("Open the split editor to change these envelopes.");
  const next: ParsedTransaction = {
    ...transaction,
    status: "pending",
    reviewSkipped: false,
    splits: [
      {
        categoryId: category.id,
        categoryName: category.name,
        amount: transaction.amount,
      },
    ],
  };
  const error = reviewValidation(next);
  if (error || !validAllocation(next.splits, next.amount))
    throw new Error(
      error ?? "Check the transaction details before choosing an envelope.",
    );
  return next;
}
export function reviewPatch(t: ParsedTransaction): CategoryReview["patch"] {
  return {
    date: t.date,
    description: t.description,
    total_amount: t.amount,
    transaction_type: t.transaction_type,
    account_id: t.account_id ?? null,
    credit_card_id: t.credit_card_id ?? null,
    is_historical: !!t.is_historical,
    tag_ids: t.tag_ids ?? [],
    splits: t.splits
      .filter((s) => !t.reviewSkipped || validAllocation([s], s.amount))
      .map((s) => ({
        category_id: s.categoryId,
        amount: s.amount,
      })),
  };
}
/** Current fields only; saved bank payload and deduplication identity are never rewritten. */
export function hydrateCategoryReview(
  t: ParsedTransaction,
  row: {
    category_review?: CategoryReview | null;
    category_suggestion?: CategorySuggestion | null;
  },
  categories: { id: number; name: string }[],
): ParsedTransaction {
  const review = row.category_review;
  const suggestion = row.category_suggestion;
  const names = new Map(categories.map((c) => [c.id, c.name]));
  if (review)
    return {
      ...t,
      categoryReview: review,
      categorization: suggestion ?? undefined,
      date: review.patch.date,
      description: review.patch.description,
      amount: review.patch.total_amount,
      merchant: review.merchant,
      transaction_type: review.patch.transaction_type,
      account_id: review.patch.account_id,
      credit_card_id: review.patch.credit_card_id,
      is_historical: review.patch.is_historical,
      tag_ids: review.patch.tag_ids,
      forceImport: review.forceImport,
      isDuplicate: review.forceImport ? false : t.isDuplicate,
      duplicateType: review.forceImport ? null : t.duplicateType,
      status: review.state === "skipped" ? "excluded" : "pending",
      reviewSkipped: review.state === "skipped",
      splits: review.patch.splits.map((s) => ({
        categoryId: s.category_id,
        categoryName: names.get(s.category_id) ?? "Unavailable envelope",
        amount: s.amount,
      })),
    };
  return {
    ...t,
    categoryReview: undefined,
    categorization: suggestion ?? undefined,
    ...(suggestion
      ? {
          splits: suggestion.categoryId
            ? [
                {
                  categoryId: suggestion.categoryId,
                  categoryName: names.get(suggestion.categoryId) ?? "",
                  amount: t.amount,
                },
              ]
            : [],
          status: "pending" as const,
        }
      : {}),
  };
}
export function buildHistory(
  observations: HistoryObservation[],
  type: string,
  eligible: Set<number>,
  now: Date = new Date(),
): CategorySuggestion["history"] {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  const history = [
    ...new Map(
      observations
        .filter(
          (t) =>
            t.transaction_type === type &&
            t.date >= cutoff.toISOString().slice(0, 10) &&
            t.date <= now.toISOString().slice(0, 10),
        )
        .map((t) => [t.id, t]),
    ).values(),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const confirmed = history.filter((t) => t.confirmed);
  const counts = new Map<
    number,
    { name: string; confirmed: number; other: number }
  >();
  for (const t of history)
    for (const split of t.splits)
      if (eligible.has(split.categoryId)) {
        const count = counts.get(split.categoryId) ?? {
          name: split.categoryName,
          confirmed: 0,
          other: 0,
        };
        // A split is one mixed observation, never independent single-envelope evidence.
        if (t.confirmed && t.splits.length === 1) count.confirmed++;
        else count.other++;
        counts.set(split.categoryId, count);
      }
  const candidates = [...counts]
    .sort((a, b) => b[1].confirmed - a[1].confirmed || b[1].other - a[1].other)
    .slice(0, 3)
    .map(([id, c]) => ({
      categoryId: id,
      categoryName: c.name,
      count: c.confirmed,
      reason: c.confirmed
        ? `${c.confirmed} confirmed ${c.confirmed === 1 ? "purchase" : "purchases"}`
        : `${c.other} previous ${c.other === 1 ? "transaction" : "transactions"} · not confirmed`,
    }));
  const first = candidates[0];
  const splitCount = confirmed.filter((t) => t.splits.length > 1).length;
  const recentCutoff = new Date(now.getTime() - 30 * 86400000)
    .toISOString()
    .slice(0, 10);
  const strong =
    !!first &&
    confirmed.length >= 20 &&
    (first.count ?? 0) / confirmed.length >= 0.95 &&
    new Set(confirmed.map((t) => t.date)).size >= 3 &&
    new Set(confirmed.map((t) => t.session)).size >= 2 &&
    confirmed
      .slice(0, 5)
      .every(
        (t) =>
          t.splits.length === 1 && t.splits[0].categoryId === first.categoryId,
      ) &&
    !confirmed.some(
      (t) =>
        (t.corrected && (t.confirmedAt ?? t.date) >= recentCutoff) ||
        (t.date >= recentCutoff && t.splits.length > 1),
    );
  const mixed = candidates.filter((c) => (c.count ?? 0) > 0).length > 1;
  const reason = splitCount
    ? "You sometimes split purchases at this merchant."
    : mixed
      ? "You use more than one envelope at this merchant."
      : first
        ? first.count
          ? `Based on ${first.count} confirmed ${first.count === 1 ? "choice" : "choices"} in this budget.`
          : "From your earlier transactions. Confirm this purchase’s envelope."
        : "Choose an envelope. Your confirmed choices will help with future imports.";
  return {
    candidates,
    confirmedCount: confirmed.length,
    otherCount: history.length - confirmed.length,
    splitCount,
    recent: history.slice(0, 5),
    eligible: strong,
    reason,
  };
}
export function combineSuggestions(
  s: CategorySuggestion,
  automation: { history: boolean; ai: boolean; aiThreshold: number } = {
    history: false,
    ai: false,
    aiThreshold: 1,
  },
): CategorySuggestion {
  const h = s.history.candidates[0];
  const a = s.ai?.state === "complete" ? s.ai.candidate : null;
  const disagreement = !!h && !!a && h.categoryId !== a.categoryId;
  const category = a ?? h;
  const source =
    a && h && !disagreement ? "both" : a ? "ai" : h ? "history" : null;
  const automaticBasis =
    s.alwaysAsk || disagreement
      ? null
      : h && automation.history && s.history.eligible
        ? "history"
        : a &&
            automation.ai &&
            (s.ai?.confidence ?? 0) >= automation.aiThreshold
          ? "ai"
          : null;
  return {
    ...s,
    source,
    categoryId: disagreement ? null : (category?.categoryId ?? null),
    automaticBasis,
    outcome: automaticBasis ? "auto" : category ? "suggest" : "ask",
    reason: s.alwaysAsk
      ? "You asked to review this merchant every time."
      : disagreement
        ? "AI and your history suggest different envelopes. Choose what this purchase was for."
        : a
          ? s.ai!.reason
          : s.history.reason,
  };
}
export function aiEligible(t: ParsedTransaction, explicit = false) {
  return (
    categorizationBucket(t) !== "duplicates" &&
    !t.reviewSkipped &&
    t.categoryReview?.state !== "skipped" &&
    (explicit || (!t.categoryReview && t.categorization?.outcome !== "auto"))
  );
}
