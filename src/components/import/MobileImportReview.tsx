"use client";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Search,
  X,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/utils";
import type { Account, Category, CreditCard } from "@/lib/types";
import type { ParsedTransaction } from "@/lib/import-types";
import {
  filterReviewItems,
  formatReviewDate,
  isReviewDuplicate,
  reviewBucket,
  validReviewSplits,
  type ReviewFilter,
} from "@/lib/import/mobile-review";
import MobileTransactionReview from "./MobileTransactionReview";

interface Props {
  items: ParsedTransaction[];
  categories: Category[];
  accounts: Account[];
  cards: CreditCard[];
  onUpdate: (item: ParsedTransaction) => void;
  onImport: () => void;
  importing: boolean;
  selected: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onBulkEdit?: () => void;
  ai?: { run: () => void; busy: boolean; disabled: boolean };
}
const labels: Record<ReviewFilter, string> = {
  attention: "Needs review",
  ready: "Ready",
  skipped: "Left out",
  all: "All",
};
function statusLabel(item: ParsedTransaction) {
  if (isReviewDuplicate(item))
    return item.duplicateType === "within-file"
      ? "Possible duplicate"
      : "Duplicate";
  const state = reviewBucket(item);
  if (state === "attention" && validReviewSplits(item)) return "Check details";
  return state === "attention"
    ? item.splits.length
      ? "Check splits"
      : "Needs envelope"
    : labels[state];
}
export default function MobileImportReview(props: Props) {
  const { items, selected, onSelectionChange } = props;
  const [filter, setFilter] = useState<ReviewFilter>(() =>
    items.some((item) => reviewBucket(item) === "attention")
      ? "attention"
      : "all",
  );
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(20);
  const [selecting, setSelecting] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [session, setSession] = useState<{
    ids: string[];
    index: number;
  } | null>(null);
  const counts = useMemo(() => {
    const count = { attention: 0, ready: 0, skipped: 0, all: items.length };
    items.forEach((item) => count[reviewBucket(item)]++);
    return count;
  }, [items]);
  const filtered = useMemo(
    () => filterReviewItems(items, filter, search),
    [items, filter, search],
  );
  const current =
    session && items.find((item) => item.id === session.ids[session.index]);

  function open(id: string) {
    setSession({
      ids: filtered.map((item) => item.id),
      index: filtered.findIndex((item) => item.id === id),
    });
  }
  function choose(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }
  function finish(item: ParsedTransaction) {
    props.onUpdate(item);
    setChecked((previous) => new Set(previous).add(item.id));
    setSession((previous) =>
      previous && previous.index + 1 < previous.ids.length
        ? { ...previous, index: previous.index + 1 }
        : null,
    );
  }
  return (
    <section
      className="nl-mobile-import-review"
      aria-label="Review imported transactions"
    >
      <div className="nl-mobile-review-intro">
        <p>
          Check envelopes and duplicates, then confirm your import. Finish this
          review before leaving the page.
        </p>
      </div>
      <div
        className="nl-mobile-review-filters"
        role="group"
        aria-label="Filter import review"
      >
        {(["attention", "ready", "skipped", "all"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => {
              setFilter(value);
              setLimit(20);
            }}
          >
            <span>{labels[value]}</span>
            <strong>{counts[value]}</strong>
          </button>
        ))}
      </div>
      <label className="nl-mobile-review-search">
        <Search size={17} aria-hidden="true" />
        <input
          aria-label="Find an imported transaction"
          placeholder="Find a merchant or description…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setLimit(20);
          }}
        />
        {search && (
          <button
            type="button"
            aria-label="Clear transaction search"
            onClick={() => setSearch("")}
          >
            <X size={17} />
          </button>
        )}
      </label>
      <div className="nl-mobile-review-tools">
        <button
          className="nl-secondary"
          disabled={!filtered.length || props.importing}
          onClick={() =>
            open(
              filtered.find((item) => !checked.has(item.id))?.id ??
                filtered[0].id,
            )
          }
        >
          Review one at a time <ArrowRight size={16} />
        </button>
        {props.onBulkEdit && (
          <button
            className="nl-mobile-icon-action"
            aria-label={
              selecting
                ? "Cancel transaction selection"
                : "Select transactions for bulk editing"
            }
            aria-pressed={selecting}
            onClick={() => {
              setSelecting(!selecting);
              onSelectionChange(new Set());
            }}
          >
            {selecting ? <X size={18} /> : <SlidersHorizontal size={18} />}
          </button>
        )}
      </div>
      {selecting && (
        <div className="nl-mobile-selection">
          <span>{selected.size} selected</span>
          <button
            onClick={() =>
              onSelectionChange(new Set(filtered.map((item) => item.id)))
            }
          >
            Select all {filtered.length}
          </button>
          <button onClick={() => onSelectionChange(new Set())}>Clear</button>
        </div>
      )}
      {props.ai && filter === "attention" && counts.attention > 0 && (
        <button
          className="nl-secondary nl-mobile-ai"
          disabled={props.ai.disabled || props.ai.busy}
          onClick={props.ai.run}
        >
          <Sparkles size={16} />
          {props.ai.busy
            ? "Suggesting envelopes…"
            : "Suggest envelopes with AI"}
        </button>
      )}
      <p className="nl-mobile-review-count" aria-live="polite">
        {filtered.length}{" "}
        {filtered.length === 1 ? "transaction" : "transactions"}
        {checked.size > 0
          ? ` · ${items.filter((item) => checked.has(item.id)).length} checked this visit`
          : ""}
      </p>
      {filtered.length ? (
        <ul className="nl-mobile-review-list">
          {filtered.slice(0, limit).map((item) => (
            <li key={item.id} data-status={reviewBucket(item)}>
              {selecting && (
                <label className="nl-mobile-review-select">
                  <Checkbox
                    checked={selected.has(item.id)}
                    onCheckedChange={() => choose(item.id)}
                    aria-label={`Select ${item.merchant}, ${formatCurrency(item.amount)}`}
                  />
                </label>
              )}
              <button
                className="nl-mobile-review-card"
                onClick={() => (selecting ? choose(item.id) : open(item.id))}
              >
                <span className="nl-mobile-card-top">
                  <strong>{item.merchant || item.description}</strong>
                  <strong
                    className={
                      item.transaction_type === "income" ? "nl-accent" : ""
                    }
                  >
                    {item.transaction_type === "income" ? "+" : "−"}
                    {formatCurrency(item.amount)}
                  </strong>
                </span>
                <span className="nl-mobile-card-description">
                  {item.description}
                </span>
                <span className="nl-mobile-card-meta">
                  {formatReviewDate(item.date)}
                  {item.is_historical ? " · Historical" : ""} ·{" "}
                  {item.splits.length > 1
                    ? `${item.splits.length} envelopes`
                    : item.splits[0]?.categoryName || "No envelope yet"}
                </span>
                <span className="nl-mobile-card-bottom">
                  <span className="nl-mobile-status">{statusLabel(item)}</span>
                  <span>
                    {checked.has(item.id) ? (
                      <>
                        <Check size={14} /> Checked
                      </>
                    ) : (
                      <>
                        Review <ChevronRight size={15} />
                      </>
                    )}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="nl-panel nl-mobile-review-empty">
          <Check size={23} />
          <h3>
            {search
              ? "No matching transactions"
              : filter === "attention"
                ? "Nothing needs attention"
                : "Nothing in this view"}
          </h3>
          <p>
            {search
              ? "Try a different merchant or description."
              : "You can check the other views before importing."}
          </p>
          <button
            className="nl-secondary"
            onClick={() => {
              setFilter("all");
              setSearch("");
            }}
          >
            View all transactions
          </button>
        </div>
      )}
      {filtered.length > limit && (
        <button
          className="nl-secondary nl-mobile-load-more"
          onClick={() => setLimit((value) => value + 20)}
        >
          Show 20 more · {filtered.length - limit} remaining
        </button>
      )}
      <div className="nl-mobile-import-bar">
        {selecting ? (
          <>
            <span>{selected.size} selected</span>
            <button
              className="nl-primary"
              disabled={!selected.size || props.importing}
              onClick={props.onBulkEdit}
            >
              Edit selected
            </button>
          </>
        ) : (
          <>
            <div>
              <strong>{counts.ready} ready to import</strong>
              <span>
                {counts.attention} need review · {counts.skipped} left out
              </span>
            </div>
            <button
              className="nl-primary"
              disabled={!counts.ready || props.importing || props.ai?.busy}
              onClick={props.onImport}
            >
              {props.importing ? "Importing…" : "Review import"}
              <ArrowRight size={16} />
            </button>
          </>
        )}
      </div>
      {current && session && (
        <MobileTransactionReview
          key={current.id}
          categories={props.categories}
          accounts={props.accounts}
          cards={props.cards}
          transaction={current}
          position={session.index + 1}
          total={session.ids.length}
          onClose={() => setSession(null)}
          onMove={(direction) =>
            setSession((previous) =>
              previous
                ? { ...previous, index: previous.index + direction }
                : null,
            )
          }
          onFinish={finish}
        />
      )}
    </section>
  );
}
