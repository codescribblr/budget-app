"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Tag as TagIcon,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Category,
  MerchantGroup,
  Tag,
  TransactionWithSplits,
} from "@/lib/types";
import { money } from "@/lib/new-look";
import { parseLocalDate, formatLocalDate } from "@/lib/date-utils";
import { envelopeDetailHref } from "@/lib/envelope-navigation";
import {
  matchedTransactionAmount,
  parseReviewFilters,
  reviewDatePreset,
  transactionReviewSorts,
  type TransactionReviewResult,
} from "@/lib/transaction-review";
import { TRANSACTION_CATEGORIES_API } from "@/lib/transaction-categories";
import { useFeature } from "@/contexts/FeatureContext";
import { useImportPaths } from "@/components/import/use-import-paths";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import AddTransactionDialog from "@/components/transactions/AddTransactionDialog";
import EditTransactionDialog from "@/components/transactions/EditTransactionDialog";
import BulkTagDialog from "@/components/tags/BulkTagDialog";
import { DataBoundary, budgetRequest, useBudget } from "./budget-context";
import { PageHeading, ReadOnlyNotice } from "./common";
import { TransactionFilter } from "./transaction-filters";
import { NativeSelect } from "./native-select";
import { TransactionReviewDetail } from "./transaction-detail";

export function GuidedTransactions() {
  const { data } = useBudget();
  return (
    <DataBoundary>
      {data && <TransactionReview key={data.identity.activeAccountId} />}
    </DataBoundary>
  );
}
function TransactionReview() {
  const { data, canEdit, refresh: refreshBudget } = useBudget();
  const { importPath } = useImportPaths();
  const params = useSearchParams();
  const search = params.toString();
  const latestSearch = useRef(search);
  const renderedSearch = useRef(search);
  if (renderedSearch.current !== search) {
    latestSearch.current = search;
    renderedSearch.current = search;
  }
  const tagsEnabled = useFeature("tags");
  const [result, setResult] = useState<{
    key: string;
    value: TransactionReviewResult;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [searchText, setSearchText] = useState(params.get("q") || "");
  const [categories, setCategories] = useState<Category[]>(data!.categories);
  const [merchants, setMerchants] = useState<MerchantGroup[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [optionsError, setOptionsError] = useState(false);
  const [optionsAttempt, setOptionsAttempt] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<TransactionWithSplits | null>(null);
  const [deleting, setDeleting] = useState<TransactionWithSplits | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchCategory, setBatchCategory] = useState("");
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchTags, setBatchTags] = useState(false);
  const [mutationNotice, setMutationNotice] = useState<string | null>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const query = useMemo(() => {
    const next = new URLSearchParams(search);
    ["transaction", "editId", "checkin", "dateRange"].forEach((key) =>
      next.delete(key),
    );
    return next.toString();
  }, [search]);
  let filters,
    filterError: string | null = null;
  try {
    filters = parseReviewFilters(new URLSearchParams(query));
  } catch (err) {
    filterError = err instanceof Error ? err.message : "Invalid filters";
    filters = parseReviewFilters(new URLSearchParams());
  }
  const loaded = result?.key === query ? result.value : null;
  const rows = loaded?.transactions || [];
  const change = useCallback(
    (
      updates: Record<string, string | null>,
      resetPage = true,
      push = false,
    ) => {
      const next = new URLSearchParams(latestSearch.current);
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      if (resetPage) {
        next.delete("page");
        next.delete("transaction");
        next.delete("editId");
      }
      // Read the latest requested URL as well as the latest rendered URL for rapid filter clicks.
      latestSearch.current = next.toString();
      // Native history keeps Next's search params in sync without a route
      // fetch that would remount the review and interrupt typing.
      window.history[push ? "pushState" : "replaceState"](
        null,
        "",
        `/new/transactions${next.size ? `?${next}` : ""}`,
      );
    },
    [],
  );
  const clearFilters = () => {
    const next = new URLSearchParams();
    if (params.get("checkin") === "weekly") next.set("checkin", "weekly");
    setSearchText("");
    latestSearch.current = next.toString();
    window.history.replaceState(
      null,
      "",
      `/new/transactions${next.size ? `?${next}` : ""}`,
    );
  };
  const urlSearch = params.get("q") || "";
  useEffect(() => setSearchText(urlSearch), [urlSearch]);
  useEffect(() => {
    if (searchText === urlSearch) return;
    const timer = setTimeout(() => change({ q: searchText.trim() }), 350);
    return () => clearTimeout(timer);
  }, [searchText, urlSearch, change]);
  useEffect(() => {
    setSelected(new Set());
    setMutationNotice(null);
  }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/transactions/review?${query}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body?.error || "Transactions could not be loaded.");
        if (
          !Array.isArray(body.transactions) ||
          !Number.isFinite(body.total) ||
          !body.summary
        )
          throw new Error("Transactions could not be loaded.");
        if (!controller.signal.aborted) {
          setResult({ key: query, value: body });
          setSelected(
            (old) =>
              new Set(
                [...old].filter((id) =>
                  body.transactions.some(
                    (t: TransactionWithSplits) => t.id === id,
                  ),
                ),
              ),
          );
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err.message || "Transactions could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, attempt]);
  useEffect(() => {
    const controller = new AbortController();
    setOptionsError(false);
    const get = async (url: string) => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error();
      const value = await response.json();
      if (!Array.isArray(value)) throw new Error();
      return value;
    };
    Promise.all([
      get(TRANSACTION_CATEGORIES_API),
      get("/api/merchant-groups"),
      tagsEnabled ? get("/api/tags") : Promise.resolve([]),
    ])
      .then(([cats, groups, labels]) => {
        if (!controller.signal.aborted) {
          setCategories(cats);
          setMerchants(groups);
          setTags(labels);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setOptionsError(true);
      });
    return () => controller.abort();
  }, [tagsEnabled, optionsAttempt]);
  const editId = Number(params.get("editId"));
  useEffect(() => {
    if (!Number.isSafeInteger(editId) || editId <= 0 || !canEdit) return;
    const controller = new AbortController();
    fetch(`/api/transactions/${editId}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const t = await response.json();
        if (!t?.id || !Array.isArray(t.splits)) throw new Error();
        if (!controller.signal.aborted) setEditing(t);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          toast.error("This transaction could not be opened.");
      });
    return () => controller.abort();
  }, [editId, canEdit]);
  function reload() {
    setAttempt((n) => n + 1);
  }
  function saved() {
    reload();
    void refreshBudget().catch(() =>
      toast.error(
        "The change was saved, but envelope balances could not refresh.",
      ),
    );
  }
  const transactionId = Number(params.get("transaction"));
  const openTransaction = (id: number) =>
    change({ transaction: String(id) }, false, true);
  const closeTransaction = () => change({ transaction: null }, false);
  const beginEdit = (t: TransactionWithSplits) => {
    closeTransaction();
    setEditing(t);
  };
  const beginDelete = (t: TransactionWithSplits) => {
    closeTransaction();
    setDeleting(t);
  };
  async function deleteTransaction() {
    if (!deleting || deletingBusy || !canEdit) return;
    setDeletingBusy(true);
    try {
      const response = await fetch(`/api/transactions/${deleting.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Could not delete the transaction.");
      toast.success("Transaction deleted");
      setDeleting(null);
      saved();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not confirm deletion. Refresh before trying again.",
      );
    } finally {
      setDeletingBusy(false);
    }
  }
  async function changeEnvelopes() {
    if (!canEdit || !batchCategory || !selected.size || batchBusy) return;
    setBatchBusy(true);
    setMutationNotice(null);
    try {
      const result = await budgetRequest<{
        updated: number;
        errors?: { transactionId: number; error: string }[];
      }>("/api/transactions/bulk-update", {
        transactionIds: [...selected],
        updates: { categoryId: Number(batchCategory) },
      });
      if (!Number.isFinite(result.updated))
        throw new Error(
          "Could not confirm the changes. Refresh before trying again.",
        );
      if (result.errors?.length) {
        setMutationNotice(
          `${result.updated} updated; ${result.errors.length} could not be updated. The remaining records stay selected so you can review them.`,
        );
        setSelected(new Set(result.errors.map((e) => e.transactionId)));
      } else {
        toast.success(
          `Updated ${result.updated} transaction${result.updated === 1 ? "" : "s"}`,
        );
        setSelected(new Set());
      }
      setBatchOpen(false);
      saved();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not confirm the changes. Refresh before trying again.",
      );
    } finally {
      setBatchBusy(false);
    }
  }
  const categoryOptions = categories
    .filter((c) => !c.is_buffer)
    .map((c) => ({
      value: String(c.id),
      label: `${c.name}${c.is_archived ? " · archived" : ""}`,
    }));
  const accountOptions = [
    ...data!.accounts.map((a) => ({ value: `account-${a.id}`, label: a.name })),
    ...data!.cards.map((c) => ({
      value: `card-${c.id}`,
      label: `${c.name} · card`,
    })),
  ];
  const filterGroups = [
    { key: "categoryId", label: "Envelopes", options: categoryOptions },
    { key: "accountId", label: "Accounts", options: accountOptions },
    {
      key: "merchantGroupId",
      label: "Merchants",
      options: merchants.map((m) => ({
        value: String(m.id),
        label: m.display_name,
      })),
    },
    ...(tagsEnabled
      ? [
          {
            key: "tags",
            label: "Tags",
            options: tags.map((t) => ({ value: String(t.id), label: t.name })),
          },
        ]
      : []),
  ];
  const chips = filterGroups.flatMap((group) =>
    (params.get(group.key)?.split(",").filter(Boolean) || []).map((value) => ({
      key: group.key,
      value,
      label:
        group.options.find((o) => o.value === value)?.label ||
        `${group.label}: ${value}`,
    })),
  );
  const hasFilters = !!(
    chips.length ||
    filters.q ||
    filters.startDate ||
    filters.endDate ||
    filters.types.length ||
    filters.attention !== "all" ||
    filterError
  );
  const selectedRows = rows.filter((t) => selected.has(t.id));
  const amountScope = filters.categories.length
    ? "Amounts in selected envelopes"
    : "All matching transactions";
  return (
    <div className="nl-transactions">
      {params.get("checkin") === "weekly" && (
        <div className="nl-task-return">
          <Link href={importPath()}>← Back to your weekly import review</Link>
        </div>
      )}
      <PageHeading
        eyebrow="Your spending history"
        title="Transactions"
        description="Find a purchase, see where it belongs, and make the details right."
      >
        <div className="nl-tx-heading-actions">
          <button
            className="nl-secondary"
            disabled={!canEdit}
            onClick={() => setAdding(true)}
          >
            <Plus size={15} />
            Add transaction
          </button>
          <Link className="nl-primary" href={importPath()}>
            <Upload size={16} />
            Import CSVs
          </Link>
        </div>
      </PageHeading>
      <ReadOnlyNotice />
      <section
        className="nl-tx-workspace"
        aria-label="Find and review transactions"
      >
        <div className="nl-tx-toolbar">
          <label className="nl-tx-search">
            <Search size={18} aria-hidden="true" />
            <input
              aria-label="Search merchants or descriptions"
              placeholder="Search merchants or descriptions…"
              maxLength={200}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            {searchText && (
              <button
                aria-label="Clear search"
                onClick={() => {
                  setSearchText("");
                  change({ q: null });
                }}
              >
                <X size={15} />
              </button>
            )}
          </label>
          <DateRangeFilter
            start={parseLocalDate(filters.startDate || "") || undefined}
            end={parseLocalDate(filters.endDate || "") || undefined}
            preset={{
              value:
                params.get("dateRange") ||
                (filters.startDate || filters.endDate ? "custom" : "all"),
              onChange: (value) => {
                if (value === "custom") {
                  change({ dateRange: "custom" }, false);
                  return;
                }
                const range = reviewDatePreset(value);
                change({
                  dateRange: value,
                  startDate: range.start,
                  endDate: range.end,
                });
              },
            }}
            onChange={(start, end) =>
              change({
                startDate: start ? formatLocalDate(start) : null,
                endDate: end ? formatLocalDate(end) : null,
                dateRange: "custom",
              })
            }
          />
        </div>
        <div className="nl-tx-filterbar" data-expanded={showFilters}>
          <button
            className="nl-tx-mobile-filters"
            aria-expanded={showFilters}
            onClick={() => setShowFilters((value) => !value)}
          >
            <SlidersHorizontal size={14} />
            Filters{chips.length > 0 ? ` · ${chips.length}` : ""}
          </button>
          <span className="nl-tx-filter-label">
            <SlidersHorizontal size={14} />
            Filter
          </span>
          {filterGroups.map((group) => (
            <TransactionFilter
              key={group.key}
              label={group.label}
              options={group.options}
              values={params.get(group.key)?.split(",").filter(Boolean) || []}
              onChange={(values) => change({ [group.key]: values.join(",") })}
              hint={
                group.key === "tags" ? "Matches every selected tag." : undefined
              }
            />
          ))}
          <NativeSelect
            aria-label="Review missing details"
            className="nl-select nl-tx-attention"
            value={filters.attention}
            onChange={(e) =>
              change({
                attention: e.target.value === "all" ? null : e.target.value,
              })
            }
          >
            <option value="all">All records</option>
            <option value="envelope">Without an envelope</option>
            <option value="account">Without an account</option>
          </NativeSelect>
          {hasFilters && (
            <button className="nl-tx-clear" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
        {optionsError && (
          <p className="nl-tx-options-error" role="alert">
            Some filter options could not load.{" "}
            <button onClick={() => setOptionsAttempt((n) => n + 1)}>
              Retry options
            </button>
          </p>
        )}
        {!!chips.length && (
          <div className="nl-tx-chips">
            {chips.map((chip) => (
              <button
                key={`${chip.key}-${chip.value}`}
                aria-label={`Remove ${chip.label} filter`}
                onClick={() =>
                  change({
                    [chip.key]: params
                      .get(chip.key)!
                      .split(",")
                      .filter((v) => v !== chip.value)
                      .join(","),
                  })
                }
              >
                {chip.label}
                <X size={12} />
              </button>
            ))}
          </div>
        )}
        <div
          className="nl-tx-overview"
          aria-label="Totals for all matching transactions"
          aria-busy={loading}
        >
          <div>
            <span>
              <ArrowUpRight size={15} />
              Money out
            </span>
            <strong>
              {loading || error ? "—" : money(loaded?.summary.expenses || 0)}
            </strong>
            <small>Recorded expenses</small>
          </div>
          <div>
            <span>
              <ArrowDownLeft size={15} />
              Money in
            </span>
            <strong>
              {loading || error ? "—" : money(loaded?.summary.income || 0)}
            </strong>
            <small>Income & refunds</small>
          </div>
          <div>
            <span>
              <ReceiptText size={15} />
              Records
            </span>
            <strong>
              {loading || error ? "—" : (loaded?.total || 0).toLocaleString()}
            </strong>
            <small>{amountScope}</small>
          </div>
        </div>
        <div className="nl-tx-overview-note">
          {filters.categories.length
            ? "Amounts include only the selected envelopes’ share of split transactions. "
            : ""}
          Recorded transactions only. Spending you haven’t imported yet isn’t
          included.
        </div>
      </section>
      <section
        className="nl-tx-history"
        aria-labelledby="transaction-history-heading"
      >
        <div className="nl-tx-list-top">
          <div>
            <p className="nl-eyebrow">Follow your spending</p>
            <h2
              id="transaction-history-heading"
              ref={listHeading}
              tabIndex={-1}
            >
              Transaction history
            </h2>
          </div>
          <div className="nl-tx-list-tools">
            <button
              className="nl-tx-icon-button"
              disabled={loading}
              aria-label="Refresh transactions"
              onClick={reload}
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <NativeSelect
              className="nl-select"
              aria-label="Transaction order"
              value={filters.sort}
              onChange={(e) => change({ sort: e.target.value })}
            >
              {Object.entries(transactionReviewSorts).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="nl-tx-icon-button"
                  aria-label="More transaction tools"
                >
                  <MoreHorizontal size={19} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/transactions/duplicates">
                    <Copy size={15} />
                    Find duplicates in classic ↗
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/transactions">More bulk tools in classic ↗</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="nl-tx-list-controls">
          <div className="nl-filters" aria-label="Transaction type">
            {[
              ["", "All"],
              ["expense", "Expenses"],
              ["income", "Income & refunds"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={filters.types.join(",") === value ? "active" : ""}
                aria-pressed={filters.types.join(",") === value}
                onClick={() => change({ transactionType: value })}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            className="nl-activity-link"
            disabled={!canEdit || loading || !!error}
            onClick={() => {
              setSelecting(!selecting);
              setSelected(new Set());
            }}
          >
            {selecting ? "Done selecting" : "Select transactions"}
          </button>
        </div>
        {selecting && (
          <div className="nl-tx-selection">
            <label>
              <Checkbox
                aria-label="Select all transactions on this page"
                checked={
                  rows.length > 0 && selected.size === rows.length
                    ? true
                    : selected.size
                      ? "indeterminate"
                      : false
                }
                disabled={loading || !rows.length}
                onCheckedChange={(checked) =>
                  setSelected(
                    checked ? new Set(rows.map((t) => t.id)) : new Set(),
                  )
                }
              />
              <span>
                {selected.size
                  ? `${selected.size} selected on this page`
                  : "Select records to update together"}
              </span>
            </label>
            <div>
              <button
                className="nl-secondary"
                disabled={!selected.size || loading || !canEdit}
                onClick={() => {
                  setBatchCategory("");
                  setBatchOpen(true);
                }}
              >
                Change envelope
              </button>
              {tagsEnabled && (
                <button
                  className="nl-secondary"
                  disabled={!selected.size || loading || !canEdit}
                  onClick={() => setBatchTags(true)}
                >
                  <TagIcon size={14} />
                  Add tags
                </button>
              )}
            </div>
          </div>
        )}
        {mutationNotice && (
          <p className="nl-notice" role="alert">
            {mutationNotice}
          </p>
        )}
        {error || filterError ? (
          <div className="nl-tx-empty" role="alert">
            <ReceiptText size={26} />
            <h3>{filterError || "Your history could not be loaded"}</h3>
            <p>{filterError ? "Clear the filters to start again." : error}</p>
            <button
              className="nl-secondary"
              onClick={filterError ? clearFilters : reload}
            >
              {filterError ? "Clear filters" : "Try again"}
            </button>
          </div>
        ) : loading ? (
          <div className="nl-tx-empty" role="status">
            <RefreshCw size={24} className="animate-spin" />
            <p>Loading your transaction history…</p>
          </div>
        ) : !rows.length ? (
          <div className="nl-tx-empty">
            <ReceiptText size={28} />
            <h3>
              {loaded?.total
                ? "No records on this page"
                : hasFilters
                  ? "No transactions match these filters"
                  : "Your spending story starts here"}
            </h3>
            <p>
              {loaded?.total
                ? "Return to the first page to see matching transactions."
                : hasFilters
                  ? "Try a wider date range or remove a filter."
                  : "Import a CSV from your bank or card to bring your purchases into view."}
            </p>
            {loaded?.total ? (
              <button
                className="nl-secondary"
                onClick={() => change({ page: "1" }, false)}
              >
                First page
              </button>
            ) : hasFilters ? (
              <button className="nl-secondary" onClick={clearFilters}>
                Clear filters
              </button>
            ) : (
              <Link className="nl-primary" href={importPath()}>
                Import transactions
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="nl-tx-table-wrap">
              <table
                className={`nl-tx-table ${selecting ? "is-selecting" : ""}`}
              >
                <thead>
                  <tr>
                    {selecting && (
                      <th className="nl-tx-select-cell">
                        <span className="sr-only">Select</span>
                      </th>
                    )}
                    <th>Date</th>
                    <th>Transaction</th>
                    <th>Envelope</th>
                    <th>Account</th>
                    <th className="nl-tx-right">
                      {filters.categories.length ? "In envelopes" : "Amount"}
                    </th>
                    <th>
                      <span className="sr-only">Edit</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => {
                    const amount = matchedTransactionAmount(
                        t,
                        filters.categories,
                      ),
                      incoming = t.transaction_type === "income";
                    const merchant = t.merchant_name || t.description;
                    return (
                      <tr key={t.id} data-selected={selected.has(t.id)}>
                        {selecting && (
                          <td className="nl-tx-select-cell">
                            <Checkbox
                              aria-label={`Select ${merchant} on ${t.date}`}
                              checked={selected.has(t.id)}
                              onCheckedChange={(checked) =>
                                setSelected((old) => {
                                  const next = new Set(old);
                                  if (checked) next.add(t.id);
                                  else next.delete(t.id);
                                  return next;
                                })
                              }
                            />
                          </td>
                        )}
                        <td className="nl-tx-date">
                          <time dateTime={t.date}>
                            {parseLocalDate(t.date)?.toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            ) || t.date}
                            <small>{t.date.slice(0, 4)}</small>
                          </time>
                        </td>
                        <td className="nl-tx-description">
                          <button
                            onClick={() => openTransaction(t.id)}
                            aria-label={`Review ${merchant}, ${money(t.total_amount)}, ${t.date}`}
                          >
                            <span
                              className={`nl-tx-avatar ${incoming ? "incoming" : ""}`}
                              aria-hidden="true"
                            >
                              {incoming ? (
                                <ArrowDownLeft size={19} />
                              ) : (
                                merchant.slice(0, 1).toUpperCase()
                              )}
                            </span>
                            <span>
                              <strong>{merchant}</strong>
                              <small>
                                {t.description.toLowerCase() !==
                                merchant.toLowerCase()
                                  ? t.description
                                  : incoming
                                    ? "Income or refund"
                                    : "Expense"}
                                {t.is_historical && " · Historical"}
                              </small>
                              {!!t.tags?.length && (
                                <span className="nl-tx-row-tags">
                                  {t.tags.map((tag) => tag.name).join(" · ")}
                                </span>
                              )}
                            </span>
                          </button>
                        </td>
                        <td className="nl-tx-envelope">
                          {t.splits.length === 1 ? (
                            (() => {
                              const split = t.splits[0],
                                c = categories.find(
                                  (c) => c.id === split.category_id,
                                );
                              return c &&
                                !c.is_system &&
                                !c.is_buffer &&
                                !c.is_archived ? (
                                <Link
                                  href={envelopeDetailHref(
                                    split.category_id,
                                    search,
                                  )}
                                >
                                  {split.category_name}
                                </Link>
                              ) : (
                                <span>{split.category_name}</span>
                              );
                            })()
                          ) : t.splits.length ? (
                            <button onClick={() => openTransaction(t.id)}>
                              {t.splits.length} envelopes
                              <small>
                                {t.splits
                                  .map((s) => s.category_name)
                                  .join(", ")}
                              </small>
                            </button>
                          ) : (
                            <button
                              className="nl-tx-needs"
                              disabled={!canEdit}
                              onClick={() => beginEdit(t)}
                            >
                              Choose envelope
                            </button>
                          )}
                        </td>
                        <td className="nl-tx-account">
                          {t.account_name || t.credit_card_name || (
                            <span className="nl-tx-needs">No account</span>
                          )}
                        </td>
                        <td
                          className={`nl-tx-amount ${incoming ? "nl-accent" : ""}`}
                        >
                          <strong>
                            {incoming ? "+" : "−"}
                            {money(amount)}
                          </strong>
                          {filters.categories.length > 0 &&
                            amount !== t.total_amount && (
                              <small>of {money(t.total_amount)} total</small>
                            )}
                        </td>
                        <td className="nl-tx-edit">
                          <button
                            className="nl-tx-icon-button"
                            disabled={!canEdit}
                            aria-label={`Edit ${merchant}`}
                            onClick={() => beginEdit(t)}
                          >
                            <Pencil size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="nl-tx-pagination">
              <span>
                {((filters.page - 1) * filters.pageSize + 1).toLocaleString()}–
                {Math.min(
                  filters.page * filters.pageSize,
                  loaded!.total,
                ).toLocaleString()}{" "}
                of {loaded!.total.toLocaleString()} records
              </span>
              <label>
                Show
                <NativeSelect
                  className="nl-select"
                  aria-label="Transactions per page"
                  value={filters.pageSize}
                  onChange={(e) => change({ pageSize: e.target.value })}
                >
                  {[25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <div>
                <button
                  aria-label="Previous page"
                  disabled={filters.page === 1}
                  onClick={() => {
                    change({ page: String(filters.page - 1) }, false);
                    listHeading.current?.focus();
                    listHeading.current?.scrollIntoView({ block: "start" });
                  }}
                >
                  <ChevronLeft size={17} />
                </button>
                <span>
                  Page {filters.page} of {loaded!.totalPages}
                </span>
                <button
                  aria-label="Next page"
                  disabled={filters.page >= loaded!.totalPages}
                  onClick={() => {
                    change({ page: String(filters.page + 1) }, false);
                    listHeading.current?.focus();
                    listHeading.current?.scrollIntoView({ block: "start" });
                  }}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
      {Number.isSafeInteger(transactionId) && transactionId > 0 && (
        <TransactionReviewDetail
          key={transactionId}
          id={transactionId}
          transactions={rows}
          categories={categories}
          canEdit={canEdit && !loading}
          search={search}
          onClose={closeTransaction}
          onNavigate={(id) => change({ transaction: String(id) }, false)}
          onEdit={beginEdit}
          onDelete={beginDelete}
        />
      )}
      {adding && (
        <AddTransactionDialog
          isOpen
          onClose={() => setAdding(false)}
          categories={categories}
          onSuccess={saved}
        />
      )}
      {editing && (
        <EditTransactionDialog
          isOpen
          transaction={editing}
          categories={categories}
          merchantGroups={merchants}
          onClose={() => {
            setEditing(null);
            if (editId) change({ editId: null }, false);
          }}
          onSuccess={saved}
        />
      )}
      {batchTags && (
        <BulkTagDialog
          isOpen
          transactionIds={[...selected]}
          onClose={() => setBatchTags(false)}
          onSuccess={() => {
            setSelected(new Set());
            saved();
          }}
        />
      )}
      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !deletingBusy) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.description} · {money(deleting?.total_amount || 0)}.
              Deleting removes the record and reverses its effect on envelope
              balances. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>
              Keep transaction
            </AlertDialogCancel>
            <button
              className="nl-danger"
              disabled={deletingBusy || !canEdit}
              onClick={() => void deleteTransaction()}
            >
              {deletingBusy ? "Deleting…" : "Delete transaction"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={batchOpen}
        onOpenChange={(open) => {
          if (!batchBusy) setBatchOpen(open);
        }}
      >
        <DialogContent className="nl-tx-batch">
          <DialogTitle>
            Change envelope for {selected.size} transactions
          </DialogTitle>
          <DialogDescription>
            Assign each transaction’s full amount to one envelope. This replaces
            existing splits and updates affected balances for non-historical
            records.
          </DialogDescription>
          <label>
            Envelope
            <NativeSelect
              className="nl-select"
              value={batchCategory}
              onChange={(e) => setBatchCategory(e.target.value)}
              disabled={batchBusy}
            >
              <option value="">Choose an envelope</option>
              {categories
                .filter((c) => !c.is_archived && !c.is_buffer)
                .map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
            </NativeSelect>
          </label>
          {selectedRows.some((t) => t.splits.length > 1) && (
            <p className="nl-notice">
              This selection includes split transactions. Edit them individually
              to keep their splits.
            </p>
          )}
          <div className="nl-tx-batch-actions">
            <button
              className="nl-secondary"
              disabled={batchBusy}
              onClick={() => setBatchOpen(false)}
            >
              Cancel
            </button>
            <button
              className="nl-primary"
              disabled={batchBusy || !batchCategory || !canEdit}
              onClick={() => void changeEnvelopes()}
            >
              {batchBusy ? "Updating…" : "Update envelopes"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
