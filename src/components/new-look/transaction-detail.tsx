"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
  ReceiptText,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import TransactionDetailDialog from "@/components/transactions/TransactionDetailDialog";
import type { Category, TransactionWithSplits } from "@/lib/types";
import { money } from "@/lib/new-look";
import { envelopeDetailHref } from "@/lib/envelope-navigation";
import { parseLocalDate } from "@/lib/date-utils";

export function TransactionReviewDetail({
  id,
  transactions,
  categories,
  canEdit,
  search,
  onClose,
  onNavigate,
  onEdit,
  onDelete,
}: {
  id: number;
  transactions: TransactionWithSplits[];
  categories: Category[];
  canEdit: boolean;
  search: string;
  onClose: () => void;
  onNavigate: (id: number) => void;
  onEdit: (t: TransactionWithSplits) => void;
  onDelete: (t: TransactionWithSplits) => void;
}) {
  const known = transactions.find((t) => t.id === id);
  const [loaded, setLoaded] = useState<TransactionWithSplits | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [technical, setTechnical] = useState(false);
  useEffect(() => {
    setLoaded(null);
    setError(false);
    setTechnical(false);
    if (known) return;
    const controller = new AbortController();
    fetch(`/api/transactions/${id}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const value = await response.json();
        if (!value?.id || !Array.isArray(value.splits)) throw new Error();
        if (!controller.signal.aborted) setLoaded(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [id, known, attempt]);
  const transaction = known || loaded;
  const index = transactions.findIndex((t) => t.id === id);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="nl-tx-detail sm:max-w-[510px] top-0 left-auto right-0 translate-x-0 translate-y-0">
        <div className="nl-tx-detail-heading">
          <p className="nl-eyebrow">Transaction</p>
          <DialogTitle>
            {transaction?.merchant_name ||
              transaction?.description ||
              "Transaction details"}
          </DialogTitle>
          <DialogDescription>
            Review the purchase, its account, and where it belongs.
          </DialogDescription>
        </div>
        {error ? (
          <div className="nl-tx-detail-body" role="alert">
            <p>This transaction could not be loaded.</p>
            <button
              className="nl-secondary"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Try again
            </button>
          </div>
        ) : !transaction ? (
          <p className="nl-tx-detail-body" role="status">
            Loading transaction…
          </p>
        ) : (
          <>
            <div className="nl-tx-detail-body">
              <div
                className={`nl-tx-detail-amount ${transaction.transaction_type === "income" ? "nl-accent" : ""}`}
              >
                {transaction.transaction_type === "income" ? (
                  <ArrowDownLeft size={22} />
                ) : (
                  <ArrowUpRight size={22} />
                )}
                <strong>
                  {transaction.transaction_type === "income" ? "+" : "−"}
                  {money(transaction.total_amount)}
                </strong>
                <span>
                  {transaction.transaction_type === "income"
                    ? "Income or refund"
                    : "Expense"}
                </span>
              </div>
              <dl className="nl-tx-detail-facts">
                <div>
                  <dt>Date</dt>
                  <dd>
                    {parseLocalDate(transaction.date)?.toLocaleDateString(
                      "en-US",
                      { dateStyle: "long" },
                    ) || transaction.date}
                  </dd>
                </div>
                <div>
                  <dt>Account</dt>
                  <dd>
                    {transaction.account_name ||
                      transaction.credit_card_name ||
                      "No account assigned"}
                  </dd>
                </div>
                <div>
                  <dt>Original description</dt>
                  <dd>{transaction.description}</dd>
                </div>
              </dl>
              {transaction.is_historical && (
                <p className="nl-notice">
                  Historical record. This transaction does not change envelope
                  balances.
                </p>
              )}
              <div className="nl-tx-detail-section">
                <div>
                  <h3>
                    {transaction.splits.length > 1
                      ? "Split between envelopes"
                      : "Envelope"}
                  </h3>
                  {canEdit && (
                    <button
                      className="nl-activity-link"
                      onClick={() => onEdit(transaction)}
                    >
                      Change
                    </button>
                  )}
                </div>
                {!transaction.splits.length ? (
                  <p className="nl-tx-needs">
                    No envelope assigned. Edit this transaction to choose one.
                  </p>
                ) : (
                  transaction.splits.map((split) => {
                    const category = categories.find(
                      (c) => c.id === split.category_id,
                    );
                    return (
                      <div className="nl-tx-detail-split" key={split.id}>
                        {category &&
                        !category.is_archived &&
                        !category.is_buffer &&
                        !category.is_system ? (
                          <Link
                            href={envelopeDetailHref(split.category_id, search)}
                          >
                            {split.category_name}
                            <ArrowUpRight size={13} />
                          </Link>
                        ) : (
                          <span>
                            {split.category_name}
                            {category?.is_archived ? " · archived" : ""}
                          </span>
                        )}
                        <strong>{money(split.amount)}</strong>
                      </div>
                    );
                  })
                )}
              </div>
              {!!transaction.tags?.length && (
                <div className="nl-tx-detail-section">
                  <h3>Tags</h3>
                  <div className="nl-tx-tags">
                    {transaction.tags.map((tag) => (
                      <span key={tag.id}>{tag.name}</span>
                    ))}
                  </div>
                </div>
              )}
              <button
                className="nl-tx-source"
                onClick={() => setTechnical(true)}
              >
                <ReceiptText size={17} />
                <span>
                  Source & record details
                  <small>Import information and the original record</small>
                </span>
                <ArrowUpRight size={15} />
              </button>
            </div>
            <div className="nl-tx-detail-footer">
              <div>
                <button
                  className="nl-primary"
                  disabled={!canEdit}
                  onClick={() => onEdit(transaction)}
                >
                  <Pencil size={15} />
                  Edit transaction
                </button>
                <button
                  className="nl-tx-delete"
                  disabled={!canEdit}
                  aria-label="Delete transaction"
                  onClick={() => onDelete(transaction)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
              {index >= 0 && (
                <div className="nl-tx-detail-pagination">
                  <button
                    disabled={index === 0}
                    onClick={() => onNavigate(transactions[index - 1].id)}
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                  <span>
                    {index + 1} of {transactions.length} on this page
                  </span>
                  <button
                    disabled={index === transactions.length - 1}
                    onClick={() => onNavigate(transactions[index + 1].id)}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
        {technical && (
          <TransactionDetailDialog
            isOpen
            transactionId={id}
            onClose={() => setTechnical(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
