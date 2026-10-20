"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Wallet,
  ArrowLeftRight,
  ReceiptText,
  SlidersHorizontal,
} from "lucide-react";
import { type EnvelopeActivityGroup } from "@/lib/envelope-activity";
import { envelopeDetailHref } from "@/lib/envelope-navigation";
import TransactionDetailDialog from "@/components/transactions/TransactionDetailDialog";
import {
  envelopeActivityDetails,
  type EnvelopeActivityRecord,
} from "@/lib/envelope-activity";
import { money } from "@/lib/new-look";

interface ActivityPage {
  records: EnvelopeActivityRecord[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

export function EnvelopeActivity({
  categoryId,
  currentBalance,
  funded,
  spent,
  variant = "dialog",
  group = "all",
}: {
  variant?: "dialog" | "page";
  group?: EnvelopeActivityGroup;
  categoryId: number;
  currentBalance: number;
  funded: number;
  spent: number;
}) {
  const searchParams = useSearchParams();
  const [page, setPage] = useState<ActivityPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [transactionId, setTransactionId] = useState<number | null>(null);
  const request = useRef<AbortController | null>(null);
  const scrollArea = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (offset: number) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setLoading(true);
      setError(false);
      if (offset === 0) {
        setPage(null);
        scrollArea.current?.scrollTo({ top: 0 });
      }
      try {
        const response = await fetch(
          `/api/categories/${categoryId}/audit?limit=20&offset=${offset}&group=${group}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error("Unable to load activity");
        const data = await response.json();
        if (
          !Array.isArray(data.records) ||
          typeof data.total !== "number" ||
          typeof data.hasMore !== "boolean"
        ) {
          throw new Error("Invalid activity response");
        }
        if (controller.signal.aborted) return;
        setPage((previous) => ({
          // An entry inserted while paging can repeat at the next offset.
          records: [
            ...new Map<number, EnvelopeActivityRecord>(
              [
                ...(offset > 0 ? previous?.records || [] : []),
                ...data.records,
              ].map((record) => [record.id, record]),
            ).values(),
          ],
          total: data.total,
          hasMore: data.hasMore,
          nextOffset: offset + data.records.length,
        }));
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [categoryId, group],
  );

  useEffect(() => {
    void load(0);
    return () => request.current?.abort();
  }, [load, currentBalance]);

  return (
    <div className={variant === "page" ? "nl-activity-page" : "nl-activity-dialog"}>
      {variant === "dialog" && (
        <>
          <div className="nl-envelope-month">
            <div>
              <span>Funded this month</span>
              <strong>{money(funded)}</strong>
            </div>
            <div>
              <span>Spent this month</span>
              <strong>{money(spent)}</strong>
            </div>
          </div>
          <p className="nl-activity-hint">
            Funding counts allocations. Transfers and balance adjustments appear
            in the activity below.
          </p>
        </>
      )}
      <div className="nl-activity-heading">
        <p>Most recent changes first</p>
        <button
          type="button"
          className="nl-activity-link"
          disabled={loading}
          onClick={() => void load(0)}
        >
          Refresh activity
        </button>
      </div>
      <div
        className="nl-activity-scroll"
        ref={scrollArea}
        role="region"
        aria-label="Envelope activity"
        tabIndex={0}
        aria-busy={loading}
      >
        {loading && !page && (
          <p className="nl-activity-state" role="status">
            Loading activity…
          </p>
        )}
        {page?.records.length === 0 && !loading && (
          <p className="nl-activity-state">
            No {group === "all" ? "balance changes" : group} recorded yet. Older
            activity may predate the audit trail.
          </p>
        )}
        {!!page?.records.length && (
          <ol
            className="nl-activity-list"
            aria-label="Balance changes, newest first"
          >
            {page.records.map((record) => {
              const detail = envelopeActivityDetails(record);
              const Icon = record.change_type.startsWith("allocation_")
                ? Wallet
                : record.change_type.startsWith("transfer_")
                  ? ArrowLeftRight
                  : record.change_type.startsWith("transaction_")
                    ? ReceiptText
                    : SlidersHorizontal;
              return (
                <li key={record.id}>
                  {variant === "page" && (
                    <span className="nl-detail-event-icon" aria-hidden="true">
                      <Icon size={17} />
                    </span>
                  )}
                  <div className="nl-activity-row">
                    <strong>{detail.label}</strong>
                    <strong
                      className={`nl-number ${record.change_amount < 0 ? "nl-negative" : "nl-accent"}`}
                    >
                      {detail.amount}
                    </strong>
                  </div>
                  {detail.description && (
                    <p className="nl-activity-description">
                      {detail.description}
                    </p>
                  )}
                  {detail.context.map((text) => (
                    <p className="nl-activity-meta" key={text}>
                      {text}
                    </p>
                  ))}
                  <p className="nl-activity-balance">
                    Balance: {money(record.old_balance)} →{" "}
                    <strong>{money(record.new_balance)}</strong>
                  </p>
                  <div className="nl-activity-row nl-activity-meta">
                    <time dateTime={record.created_at}>
                      Recorded {detail.recordedAt}
                    </time>
                    {record.transaction && (
                      <button
                        type="button"
                        className="nl-activity-link"
                        onClick={() => setTransactionId(record.transaction!.id)}
                      >
                        View transaction
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {error && (
          <div className="nl-activity-state" role="alert">
            <p>
              {page
                ? "Older activity could not be loaded. Your loaded activity is still shown."
                : "Activity could not be loaded. Try again to see what changed this balance."}
            </p>
            <button
              type="button"
              className="nl-secondary"
              onClick={() => void load(page?.nextOffset || 0)}
            >
              Retry activity
            </button>
          </div>
        )}
        {page && !error && (
          <div className="nl-activity-state">
            <p role="status">
              Showing {page.records.length} of {page.total} recorded changes
            </p>
            {page.hasMore && (
              <button
                type="button"
                className="nl-secondary"
                disabled={loading}
                onClick={() => void load(page.nextOffset)}
              >
                {loading ? "Loading older activity…" : "Load older activity"}
              </button>
            )}
          </div>
        )}
      </div>
      {variant === "page" && <p className="nl-footnote">Some older changes may predate this activity history.</p>}
      {variant === "dialog" && (
        <div className="nl-activity-footer">
          <Link
            href={envelopeDetailHref(categoryId, searchParams.toString())}
            className="nl-activity-link"
          >
            Open envelope page →
          </Link>
          <Link href={`/categories/${categoryId}`} className="nl-activity-link">
            Full category details in classic ↗
          </Link>
        </div>
      )}
      {transactionId !== null && (
        <TransactionDetailDialog
          isOpen
          transactionId={transactionId}
          onClose={() => setTransactionId(null)}
        />
      )}
    </div>
  );
}
