"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Check,
  RefreshCw,
  Search,
  Sparkles,
  ArrowRight,
  Undo2,
} from "lucide-react";
import { freshFetch as fetch } from "@/lib/view-freshness";
import type { ParsedTransaction } from "@/lib/import-types";
import type { Account, Category, CreditCard } from "@/lib/types";
import {
  aiEligible,
  assignReviewEnvelope,
  canImportTransaction,
  categorizationBucket,
  hydrateCategoryReview,
  needsCategoryConfirmation,
  reviewPatch,
  type CategoryReviewBucket,
} from "@/lib/import/categorization";
import {
  categoryReviewSaveRow,
  confirmImportReview,
} from "@/lib/import/confirm-review";
import { formatCurrency } from "@/lib/utils";
import { TransactionFlowAmount } from "@/components/new-look/transaction-flow-amount";
import { initialReviewFilter, reviewViewIds } from "@/lib/import/review-view";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useFeature } from "@/contexts/FeatureContext";
import { useAIUsage } from "@/hooks/use-ai-usage";
import Link from "next/link";
import { PremiumBadge } from "@/components/subscription/PremiumBadge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SkeletonRows } from "@/components/new-look/skeleton-sections";
import { toast } from "sonner";
import MobileTransactionReview from "./MobileTransactionReview";
import ImportEnvelopePicker from "./ImportEnvelopePicker";
import BulkEditDialog, { type BulkEditUpdates } from "./BulkEditDialog";

const labels: Record<CategoryReviewBucket, string> = {
  attention: "Needs review",
  ready: "Ready",
  duplicates: "Duplicates",
  skipped: "Left out",
  all: "All",
};
export default function NewImportReview({
  transactions,
  onImportComplete,
  onSelectionChange,
  onRefresh,
}: {
  transactions: ParsedTransaction[];
  onImportComplete: () => void;
  onSelectionChange?: (ids: Set<string>) => void;
  onRefresh?: () => Promise<void>;
}) {
  const params = useParams();
  const batchId = params.batchId as string;
  const budgetId = transactions[0]?.budgetId;
  const { isPremium } = useSubscription();
  const aiEnabled = useFeature("ai_chat");
  const { stats, refreshStats } = useAIUsage();
  const [items, setItems] = useState(transactions);
  const current = useRef(items);
  current.current = items;
  const local = useRef(
    new Map<
      string,
      { previous: string | undefined; record: ParsedTransaction }
    >(),
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [metadata, setMetadata] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [reload, setReload] = useState(0);
  const [view, setView] = useState<{
    filter: CategoryReviewBucket;
    search: string;
    ids: string[];
  }>(() => {
    const filter = initialReviewFilter(transactions);
    return { filter, search: "", ids: reviewViewIds(transactions, filter, "") };
  });
  const { filter, search } = view;
  const [limit, setLimit] = useState(30);
  const [selected, setSelected] = useState(new Set<string>());
  const [session, setSession] = useState<{
    ids: string[];
    index: number;
    snapshot: ParsedTransaction;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const envelopeTriggers = useRef(new Map<string, HTMLButtonElement>());
  const listHeading = useRef<HTMLDivElement>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const running = useRef(false);
  const aiRuns = useRef(new Map<string, string>());
  const [confirmAI, setConfirmAI] = useState<ParsedTransaction[] | null>(null);
  const [confirmImport, setConfirmImport] = useState<
    ParsedTransaction[] | null
  >(null);
  const [bulk, setBulk] = useState(false);
  const [message, setMessage] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [undo, setUndo] = useState<{
    before: ParsedTransaction;
    after: ParsedTransaction;
  } | null>(null);
  const [preferences, setPreferences] = useState<any[]>([]);
  useEffect(() => {
    setItems(
      transactions.map((t) => {
        const saved = local.current.get(t.id);
        if (saved && t.revision === saved.previous) return saved.record;
        local.current.delete(t.id);
        return t;
      }),
    );
  }, [transactions]);
  useEffect(() => {
    onSelectionChange?.(selected);
  }, [selected, onSelectionChange]);
  useEffect(() => {
    let live = true;
    Promise.all(
      [
        "/api/categories?excludeGoals=false&includeArchived=all",
        "/api/accounts",
        "/api/credit-cards",
      ].map(async (url) => {
        const r = await fetch(url);
        if (!r.ok) throw new Error();
        return r.json();
      }),
    )
      .then(([c, a, cc]) => {
        if (live) {
          setCategories(c);
          setAccounts(a);
          setCards(cc);
          setMetadata("ready");
        }
      })
      .catch(() => {
        if (live) setMetadata("error");
      });
    return () => {
      live = false;
    };
  }, [budgetId, reload]);
  async function request(body: Record<string, unknown>) {
    const r = await fetch("/api/import/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budgetId, batchId, ...body }),
    });
    const data = await r.json();
    if (!r.ok) {
      const error = new Error(
        data.error ??
          (r.status === 409
            ? "This transaction changed elsewhere. Close this editor and reopen the latest saved version."
            : "Could not save. Please try again."),
      );
      Object.assign(error, { retryWithNewRun: data.retryWithNewRun === true });
      throw error;
    }
    return data;
  }
  function replace(next: ParsedTransaction[]) {
    next.forEach((t) =>
      local.current.set(t.id, {
        previous: current.current.find((c) => c.id === t.id)?.revision,
        record: t,
      }),
    );
    setItems((previous) =>
      previous.map((t) => next.find((n) => n.id === t.id) ?? t),
    );
  }
  async function persistReview(itemsToSave: ParsedTransaction[]) {
    const data = await request({
      action: "save",
      rows: itemsToSave.map(categoryReviewSaveRow),
    });
    const saved = itemsToSave.map((t) => {
      const row = data.rows.find((r: any) => `queued-${r.id}` === t.id);
      if (!row)
        throw new Error(
          "Could not save every review choice. Refresh before continuing.",
        );
      return hydrateCategoryReview(
        { ...t, revision: row.revision },
        row,
        categories,
      );
    });
    replace(saved);
    return saved;
  }
  async function save(itemsToSave: ParsedTransaction[], remember = true) {
    if (saving.current)
      throw new Error("A review choice is still saving. Please wait.");
    saving.current = true;
    setBusy(true);
    try {
      const saved = await persistReview(itemsToSave);
      if (remember && saved.length === 1) {
        const before = current.current.find((t) => t.id === saved[0].id)!;
        setUndo({ before, after: saved[0] });
      } else setUndo(null);
      setAnnouncement(
        `${saved.length === 1 ? "Review choice" : `${saved.length} choices`} saved. You can leave and resume on any device.`,
      );
      return saved;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function undoChoice() {
    if (!undo || busy) return;
    setBusy(true);
    try {
      if (undo.before.categoryReview)
        await save([{ ...undo.before, revision: undo.after.revision }], false);
      else {
        const data = await request({
          action: "save",
          rows: [
            {
              id: Number(undo.after.id.slice(7)),
              revision: undo.after.revision,
              state: "unreviewed",
              patch: reviewPatch(undo.before),
              merchant: undo.before.merchant,
              forceImport: !!undo.before.forceImport,
            },
          ],
        });
        replace([
          hydrateCategoryReview(
            { ...undo.before, revision: data.rows[0].revision },
            data.rows[0],
            categories,
          ),
        ]);
      }
      setUndo(null);
      setAnnouncement("Choice undone.");
      restoreEnvelopeFocus(undo.after.id);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  const counts = useMemo(() => {
    const c = {
      attention: 0,
      ready: 0,
      duplicates: 0,
      skipped: 0,
      all: items.length,
    };
    items.forEach((t) => c[categorizationBucket(t)]++);
    return c;
  }, [items]);
  const visibleIds = useMemo(
    () => reviewViewIds(items, filter, search, view.ids),
    [items, filter, search, view.ids],
  );
  useEffect(() => {
    if (
      visibleIds.length !== view.ids.length ||
      visibleIds.some((id, index) => id !== view.ids[index])
    )
      setView((previous) =>
        previous === view ? { ...previous, ids: visibleIds } : previous,
      );
  }, [visibleIds, view]);
  const filtered = useMemo(() => {
    const byId = new Map(items.map((t) => [t.id, t]));
    return visibleIds.map((id) => byId.get(id)!);
  }, [items, visibleIds]);
  const visibleReady = filtered.filter(
    (t) => categorizationBucket(t) === "ready",
  ).length;
  const visibleAttention = filtered.filter(
    (t) => categorizationBucket(t) === "attention",
  ).length;
  function changeView(nextFilter: CategoryReviewBucket, nextSearch = search) {
    setView({
      filter: nextFilter,
      search: nextSearch,
      ids: reviewViewIds(items, nextFilter, nextSearch),
    });
    setLimit(30);
  }
  const aiTargets = items.filter(
    (t) =>
      aiEligible(t, selected.size > 0) &&
      (!selected.size || selected.has(t.id)),
  );
  const unresolved = items.filter((t) => aiEligible(t));
  const failedAI = items.filter(
    (t) => aiEligible(t) && t.categorization?.ai?.state === "failed",
  );
  const canAI = isPremium && aiEnabled;
  const aiLimited =
    !!stats && stats.categorization.used >= stats.categorization.limit;
  function open(t: ParsedTransaction) {
    const reviewRows = filtered.filter(
      (i) =>
        filter !== "attention" ||
        categorizationBucket(i) === "attention" ||
        i.id === t.id,
    );
    setSession({
      ids: reviewRows.map((i) => i.id),
      index: reviewRows.findIndex((i) => i.id === t.id),
      snapshot: t,
    });
  }
  async function chooseEnvelope(
    snapshot: ParsedTransaction,
    category: Category,
  ) {
    await save([assignReviewEnvelope(snapshot, category)]);
    restoreEnvelopeFocus(snapshot.id);
  }
  function restoreEnvelopeFocus(id: string) {
    requestAnimationFrame(() => {
      const target = envelopeTriggers.current.get(id) ?? listHeading.current;
      target?.focus({ preventScroll: true });
    });
  }
  function advance() {
    setSession((s) => {
      if (!s) return null;
      const next = s.ids
        .slice(s.index + 1)
        .find((id) =>
          current.current.some(
            (t) =>
              t.id === id &&
              (filter !== "attention" ||
                categorizationBucket(t) === "attention"),
          ),
        );
      return next
        ? {
            ...s,
            index: s.ids.indexOf(next),
            snapshot: current.current.find((t) => t.id === next)!,
          }
        : null;
    });
  }
  async function suggest(mode: "history" | "ai", targets: ParsedTransaction[]) {
    if (running.current || !targets.length) return;
    running.current = true;
    setAiBusy(mode === "ai");
    if (mode === "history") setBusy(true);
    setConfirmAI(null);
    setMessage("");
    let saved = 0,
      conflicts = 0,
      failed = 0;
    try {
      for (let offset = 0; offset < targets.length; offset += 100) {
        const rows = targets
          .slice(offset, offset + 100)
          .map((t) => current.current.find((c) => c.id === t.id) ?? t);
        const runKey = JSON.stringify(rows.map((t) => [t.id, t.revision]));
        const runId = aiRuns.current.get(runKey) ?? crypto.randomUUID();
        aiRuns.current.set(runKey, runId);
        const result = await request({
          action: mode,
          rows: rows.map((t) => ({
            id: Number(t.id.slice(7)),
            revision: t.revision,
          })),
          ...(mode === "ai"
            ? { runId, secondOpinion: rows.some((t) => !!t.categoryReview) }
            : {}),
        });
        aiRuns.current.delete(runKey);
        setPreferences(result.preferences ?? []);
        const updates: ParsedTransaction[] = [];
        for (const r of result.results ?? []) {
          const old = rows.find((t) => t.id === `queued-${r.id}`);
          const latest = current.current.find((t) => t.id === old?.id);
          if (!old) continue;
          if (r.status !== "saved" || latest?.revision !== old.revision) {
            conflicts++;
            continue;
          }
          const t = hydrateCategoryReview(
            { ...old, revision: r.revision },
            {
              category_review: old.categoryReview,
              category_suggestion: r.suggestion,
            },
            categories,
          );
          updates.push(t);
          saved++;
          if (r.suggestion.ai?.state === "failed") failed++;
        }
        replace(updates);
        setSession((s) => {
          const update = updates.find((t) => t.id === s?.snapshot.id);
          return s && update
            ? { ...s, snapshot: { ...s.snapshot, revision: update.revision } }
            : s;
        });
      }
      setMessage(
        `${saved} ${mode === "ai" ? "AI results" : "history suggestions"} saved${failed ? ` · ${failed} need a retry` : ""}${conflicts ? ` · ${conflicts} changed while processing and were left untouched` : ""}. You can confirm suggestions together when importing.`,
      );
      if (conflicts) await onRefresh?.();
    } catch (e: any) {
      if (e.retryWithNewRun) aiRuns.current.clear();
      setMessage(e.message);
      toast.error(e.message);
    } finally {
      running.current = false;
      setAiBusy(false);
      setBusy(false);
      if (mode === "ai") void refreshStats();
    }
  }
  async function preference(t: ParsedTransaction, alwaysAsk: boolean) {
    try {
      const data = await request({
        action: "preference",
        merchantId: t.categorization?.merchantId,
        revision:
          preferences.find(
            (p) => p.merchant_id === t.categorization?.merchantId,
          )?.revision ??
          t.categorization?.preferenceRevision ??
          null,
        alwaysAsk,
      });
      setPreferences((p) => [
        ...p.filter((v) => v.merchant_id !== data.preference.merchant_id),
        data.preference,
      ]);
      setSession(null);
      await onRefresh?.();
      toast.success(
        alwaysAsk
          ? "This merchant will always need your confirmation."
          : "Suggestions are enabled for this merchant.",
      );
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function importReady(snapshot: ParsedTransaction[]) {
    if (saving.current || running.current) return;
    saving.current = true;
    setBusy(true);
    setUndo(null);
    try {
      const data = await confirmImportReview(
        snapshot,
        persistReview,
        async (ready) => {
          const r = await fetch("/api/automatic-imports/queue/approve-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              batchId,
              expectedBudgetId: budgetId,
              requireCategoryReview: true,
              transactions: ready,
            }),
          });
          const result = await r.json();
          if (!r.ok)
            throw new Error(
              result.error ?? "Could not import these transactions.",
            );
          return result;
        },
      );
      const remaining = snapshot.filter(
        (t) => categorizationBucket(t) === "attention" && !canImportTransaction(t),
      ).length;
      setMessage(
        `${data.imported} imported${data.skipped ? ` · ${data.skipped} already imported or duplicates` : ""}. ${remaining} ${remaining === 1 ? "remains" : "remain"} to review.${data.errors?.length ? ` ${data.errors.join(" ")}` : ""}`,
      );
      setSelected(new Set());
      if (data.imported === snapshot.length) onImportComplete();
      else await onRefresh?.();
    } catch (e: any) {
      toast.error(e.message);
      setMessage(e.message);
      // A lost response may have saved reviews. Reload their revisions before retrying.
      await onRefresh?.().catch(() => {});
    } finally {
      saving.current = false;
      setBusy(false);
      setConfirmImport(null);
    }
  }
  async function bulkSave(updates: BulkEditUpdates) {
    const rows = items.filter((t) => selected.has(t.id));
    if (rows.some((t) => categorizationBucket(t) === "duplicates"))
      throw new Error("Review duplicates individually before including them.");
    const next = rows.map((t) => ({
      ...t,
      date: updates.date ?? t.date,
      account_id:
        updates.accountId !== undefined ? updates.accountId : t.account_id,
      credit_card_id:
        updates.creditCardId !== undefined
          ? updates.creditCardId
          : t.credit_card_id,
      is_historical: updates.isHistorical ?? t.is_historical,
      tag_ids: updates.tagIds ?? t.tag_ids,
      transaction_type: updates.transactionType ?? t.transaction_type,
      reviewSkipped: false,
      splits: updates.categoryId
        ? [
            {
              categoryId: updates.categoryId,
              categoryName:
                categories.find((c) => c.id === updates.categoryId)?.name ?? "",
              amount: t.amount,
            },
          ]
        : t.splits,
    }));
    if (updates.categoryId === null)
      throw new Error(
        "Choose an envelope before marking selected transactions ready.",
      );
    await save(next, false);
    setBulk(false);
    setSelected(new Set());
  }
  const currentEditor = session
    ? items.find((t) => t.id === session.snapshot.id)
    : undefined;
  const importRows = (confirmImport ?? items).filter(canImportTransaction);
  const importableCount = items.filter(canImportTransaction).length;
  const unconfirmed = importRows.filter(needsCategoryConfirmation);
  const unconfirmedCount = items.filter(needsCategoryConfirmation).length;
  return (
    <section
      className="nl-category-review"
      aria-label="Review imported transactions"
    >
      <div className="nl-category-intro">
        <div>
          <h2>A place for every purchase</h2>
          <p>
            Check the envelopes below. Suggestions are included, and you can
            confirm them together when importing.
          </p>
        </div>
        <span>
          <Check size={15} /> Saved across devices
        </span>
      </div>
      <div
        className="nl-category-tabs"
        role="group"
        aria-label="Filter import review"
      >
        {(Object.keys(labels) as CategoryReviewBucket[]).map((key) => (
          <button
            key={key}
            aria-pressed={filter === key}
            onClick={() => {
              changeView(key);
            }}
          >
            {labels[key]} <strong>{counts[key]}</strong>
          </button>
        ))}
      </div>
      <div className="nl-category-toolbar">
        <label className="nl-mobile-review-search">
          <Search size={16} />
          <input
            aria-label="Search this import"
            placeholder="Find a merchant or description…"
            value={search}
            onChange={(e) => changeView(filter, e.target.value)}
          />
        </label>
        <div>
          <button
            className="nl-secondary"
            disabled={
              busy || aiBusy || !unresolved.length || metadata !== "ready"
            }
            onClick={() => suggest("history", unresolved)}
          >
            <RefreshCw size={15} />
            Suggest from history
          </button>
          {!canAI && (
            <Link
              className="nl-secondary"
              href={
                isPremium
                  ? "/new/settings/features"
                  : "/new/settings/subscription"
              }
            >
              <Sparkles size={15} />
              {isPremium ? (
                "Enable AI categorization"
              ) : (
                <>
                  AI categorize <PremiumBadge />
                </>
              )}
            </Link>
          )}
          {canAI && (
            <button
              className="nl-primary"
              disabled={
                busy ||
                aiBusy ||
                !aiTargets.length ||
                aiLimited ||
                metadata !== "ready"
              }
              onClick={() => setConfirmAI(aiTargets)}
            >
              <Sparkles size={15} />
              {aiBusy ? "Asking AI…" : `AI categorize ${aiTargets.length}`}
            </button>
          )}
        </div>
      </div>
      {canAI && failedAI.length > 0 && (
        <button
          className="nl-text-action"
          disabled={busy || aiBusy || aiLimited}
          onClick={() => setConfirmAI(failedAI)}
        >
          Retry AI for {failedAI.length} missing results
        </button>
      )}
      {canAI && aiLimited && (
        <p className="nl-footnote">
          Daily AI limit reached. You can still use history suggestions and
          choose envelopes.
        </p>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
      {selected.size > 0 && (
        <div className="nl-category-selection">
          <span>{selected.size} selected</span>
          <button
            onClick={() => setBulk(true)}
            disabled={busy || selected.size > 100 || metadata !== "ready"}
          >
            Edit & confirm selected
          </button>
          <button onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        </div>
      )}
      {metadata === "loading" ? (
        <SkeletonRows kind="transactions" label="Loading review tools" />
      ) : metadata === "error" ? (
        <div className="nl-notice" role="alert">
          Could not load review tools.{" "}
          <button
            onClick={() => {
              setMetadata("loading");
              setReload((r) => r + 1);
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div
            className="nl-category-list-heading"
            ref={listHeading}
            tabIndex={-1}
          >
            <span>
              {filter === "attention"
                ? `${visibleAttention} left to review · ${visibleReady} ready`
                : `${filtered.length} transactions`}
            </span>
            <button
              className="nl-text-action"
              disabled={
                !filtered.some(
                  (t) =>
                    filter !== "attention" ||
                    categorizationBucket(t) === "attention",
                ) || busy
              }
              onClick={() => {
                const next = filtered.find(
                  (t) =>
                    filter !== "attention" ||
                    categorizationBucket(t) === "attention",
                );
                if (next) open(next);
              }}
            >
              Review one at a time <ArrowRight size={15} />
            </button>
          </div>
          {!filtered.length ? (
            <div className="nl-panel nl-category-empty">
              <Check size={25} />
              <h3>
                {filter === "attention"
                  ? "All caught up"
                  : "Nothing in this view"}
              </h3>
              <p>
                {filter === "attention"
                  ? "Your transactions have envelopes and are ready to import."
                  : "Try another view or change your search."}
              </p>
              <button
                className="nl-secondary"
                onClick={() => {
                  changeView(counts.ready ? "ready" : "all", "");
                }}
              >
                {counts.ready ? "View ready transactions" : "View all"}
              </button>
            </div>
          ) : (
            <ul className="nl-category-list">
              {filtered.slice(0, limit).map((t) => {
                const bucket = categorizationBucket(t);
                const unconfirmedChoice = needsCategoryConfirmation(t);
                const source =
                  t.categoryReview?.state === "reviewed"
                    ? "Reviewed"
                    : t.categorization?.outcome === "auto"
                      ? "Auto-assigned"
                      : t.categorization?.source === "ai"
                        ? "AI suggestion"
                        : t.categorization?.source === "both"
                          ? "AI + history"
                          : t.categorization?.source === "history"
                            ? "History suggestion"
                            : bucket === "duplicates"
                              ? "Duplicate"
                              : bucket === "skipped"
                                ? "Left out"
                                : t.splits.length
                                  ? "Check suggestion"
                                  : "Needs envelope";
                return (
                  <li
                    key={t.id}
                    data-state={unconfirmedChoice ? "suggested" : bucket}
                    data-review-id={t.id}
                  >
                    <Checkbox
                      aria-label={`Select ${t.merchant}, ${formatCurrency(t.amount)} money ${t.transaction_type === "income" ? "in" : "out"}`}
                      checked={selected.has(t.id)}
                      disabled={busy}
                      onCheckedChange={() =>
                        setSelected((p) => {
                          const n = new Set(p);
                          if (n.has(t.id)) n.delete(t.id);
                          else n.add(t.id);
                          return n;
                        })
                      }
                    />
                    <div className="nl-category-row">
                      <button
                        type="button"
                        className="nl-category-merchant"
                        onClick={() => open(t)}
                        aria-label={`Details and split for ${t.merchant || t.description}`}
                      >
                        <strong>{t.merchant || t.description}</strong>
                        <small>{t.description}</small>
                        <span>
                          {t.date} ·{" "}
                          {accounts.find((a) => a.id === t.account_id)?.name ??
                            cards.find((c) => c.id === t.credit_card_id)
                              ?.name ??
                            "No account assigned"}
                        </span>
                        <span className="nl-category-details-link">
                          Details & split
                        </span>
                      </button>
                      <div className="nl-category-envelope">
                        {bucket === "duplicates" || t.splits.length > 1 ? (
                          <button
                            type="button"
                            className="nl-envelope-picker-trigger"
                            disabled={busy}
                            ref={(node) => {
                              if (node)
                                envelopeTriggers.current.set(t.id, node);
                              else envelopeTriggers.current.delete(t.id);
                            }}
                            onClick={() => open(t)}
                          >
                            {bucket === "duplicates"
                              ? "Review duplicate"
                              : `Edit ${t.splits.length} envelopes`}
                          </button>
                        ) : (
                          <ImportEnvelopePicker
                            transaction={t}
                            categories={categories}
                            disabled={busy}
                            triggerRef={(node) => {
                              if (node)
                                envelopeTriggers.current.set(t.id, node);
                              else envelopeTriggers.current.delete(t.id);
                            }}
                            onChoose={chooseEnvelope}
                            onDetails={() => open(t)}
                          />
                        )}
                        <div className="nl-category-envelope-meta">
                          <span title={source}>
                            {unconfirmedChoice
                              ? `${source} · included in import`
                              : bucket === "ready"
                                ? "Confirmed for import"
                                : bucket === "duplicates"
                                  ? "Excluded until you confirm"
                                  : bucket === "skipped"
                                    ? "Left out of this import"
                                    : t.splits[0]?.categoryId > 0
                                      ? `${source} · choose to confirm`
                                      : "Choose to mark ready"}
                          </span>
                          {undo?.after.id === t.id && (
                            <button
                              type="button"
                              onClick={undoChoice}
                              disabled={busy}
                              aria-label={`Undo envelope choice for ${t.merchant || t.description}`}
                            >
                              <Undo2 size={12} aria-hidden="true" /> Undo
                            </button>
                          )}
                        </div>
                      </div>
                      <span className="nl-category-amount">
                        <TransactionFlowAmount
                          amount={t.amount}
                          transactionType={t.transaction_type}
                        />
                        <small className="nl-category-status" title={source}>
                          {unconfirmedChoice ? (
                            "Suggested"
                          ) : bucket === "ready" ? (
                            <>
                              <Check size={12} aria-hidden="true" /> Confirmed
                            </>
                          ) : (
                            source
                          )}
                        </small>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {filtered.length > limit && (
            <button
              className="nl-secondary nl-mobile-load-more"
              onClick={() => setLimit((n) => n + 30)}
            >
              Show 30 more
            </button>
          )}
        </>
      )}
      {message && (
        <p className="nl-category-result" role="status">
          {message}
        </p>
      )}
      <div className="nl-category-finish">
        <div>
          <strong>{importableCount} can be imported</strong>
          <span>
            {unconfirmedCount > 0 &&
              `${unconfirmedCount} to confirm at import · `}
            {counts.attention - unconfirmedCount} need an envelope or correction · {counts.duplicates} duplicates ·{" "}
            {counts.skipped} left out
          </span>
        </div>
        <button
          className="nl-primary"
          disabled={!importableCount || busy || aiBusy || metadata !== "ready"}
          onClick={() => {
            const snapshot = current.current;
            if (snapshot.some(needsCategoryConfirmation))
              setConfirmImport(snapshot);
            else void importReady(snapshot);
          }}
        >
          {busy
            ? "Saving…"
            : `Import ${importableCount} ${importableCount === 1 ? "transaction" : "transactions"}`}
          <ArrowRight size={16} />
        </button>
      </div>
      {session && metadata === "ready" && (
        <MobileTransactionReview
          key={session.snapshot.id}
          transaction={session.snapshot}
          categories={categories}
          accounts={accounts}
          cards={cards}
          position={session.index + 1}
          total={session.ids.length}
          onClose={() => setSession(null)}
          onMove={(direction) =>
            setSession((s) => {
              if (!s) return null;
              const index = s.index + direction;
              const snapshot = items.find((t) => t.id === s.ids[index]);
              return snapshot ? { ...s, index, snapshot } : null;
            })
          }
          onFinish={async (t) => {
            await save([t]);
            advance();
          }}
          suggestion={currentEditor?.categorization}
          onAI={
            canAI && !aiLimited
              ? () => setConfirmAI(currentEditor ? [currentEditor] : [])
              : undefined
          }
          aiBusy={aiBusy}
          onPreference={
            currentEditor?.categorization?.merchantId
              ? (value) => preference(currentEditor, value)
              : undefined
          }
        />
      )}
      <Dialog
        open={!!confirmAI}
        onOpenChange={(open) => {
          if (!open) setConfirmAI(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Ask AI about {confirmAI?.length} transactions
            </DialogTitle>
            <DialogDescription>
              AI will use these transaction details, your envelopes, and
              relevant history from this budget. Suggestions stay editable and
              won’t replace your reviewed choices.
            </DialogDescription>
          </DialogHeader>
          <p>
            {confirmAI?.length && confirmAI.length > 100
              ? `${Math.ceil(confirmAI.length / 100)} requests, up to 100 transactions each.`
              : "Uses one request from your daily AI allowance."}{" "}
            Duplicates and left-out transactions are excluded.
          </p>
          <div className="nl-category-dialog-actions">
            <button className="nl-secondary" onClick={() => setConfirmAI(null)}>
              Cancel
            </button>
            <button
              className="nl-primary"
              onClick={() => suggest("ai", confirmAI ?? [])}
            >
              <Sparkles size={16} />
              Get suggestions
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!confirmImport}
        onOpenChange={(open) => {
          if (!open && !saving.current) setConfirmImport(null);
        }}
      >
        <DialogContent
          className="nl-import-confirm-dialog"
          showCloseButton={!busy}
        >
          <DialogHeader>
            <DialogTitle>
              Import {importRows.length}{" "}
              {importRows.length === 1 ? "transaction" : "transactions"}?
            </DialogTitle>
            <DialogDescription>
              {unconfirmed.length}{" "}
              {unconfirmed.length === 1
                ? "envelope suggestion"
                : "envelope suggestions"}{" "}
              will be confirmed automatically when you import.
            </DialogDescription>
          </DialogHeader>
          {(confirmImport?.length ?? 0) > importRows.length && (
            <p className="nl-footnote">
              {(confirmImport?.length ?? 0) - importRows.length}{" "}
              {(confirmImport?.length ?? 0) - importRows.length === 1
                ? "transaction won’t"
                : "transactions won’t"}{" "}
              be imported and will stay in this batch for later.
            </p>
          )}
          <div className="nl-category-dialog-actions">
            <button
              className="nl-secondary"
              disabled={busy}
              onClick={() => {
                setConfirmImport(null);
                changeView("attention", "");
                if (unconfirmed[0]) restoreEnvelopeFocus(unconfirmed[0].id);
              }}
            >
              Review individually
            </button>
            <button
              className="nl-primary"
              disabled={busy}
              onClick={() => confirmImport && void importReady(confirmImport)}
            >
              {busy
                ? "Confirming & importing…"
                : `Confirm all & import ${importRows.length}`}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {bulk && (
        <BulkEditDialog
          open
          transactions={items.filter((t) => selected.has(t.id))}
          categories={categories}
          accounts={accounts}
          creditCards={cards}
          onClose={() => setBulk(false)}
          onSave={bulkSave}
        />
      )}
    </section>
  );
}
