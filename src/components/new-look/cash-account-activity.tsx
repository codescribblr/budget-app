"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { money } from "@/lib/new-look";
import { parseLocalDate } from "@/lib/date-utils";
import type { TransactionWithSplits } from "@/lib/types";
import { useBudgetResource } from "./use-budget-resource";
import { SkeletonRows } from "./skeleton-sections";
import { TransactionFlowAmount } from "./transaction-flow-amount";

export type CashKind = "account" | "card";
export function cashEndpoint(kind: CashKind, id: number) {
  return `/api/${kind === "card" ? "credit-cards" : "accounts"}/${id}`;
}
export function cashHref(kind: CashKind, id: number) {
  return `/new/${kind === "card" ? "credit-cards" : "accounts"}/${id}`;
}
export function accountTransactionsHref(kind: CashKind, id: number) {
  return `/new/transactions?accountId=${kind}-${id}&dateRange=all`;
}
export interface CashAudit {
  id: number;
  created_at: string;
  old_balance?: number;
  new_balance?: number;
  old_available_credit?: number;
  new_available_credit?: number;
  change_type: string;
  description?: string;
  transaction_id?: number;
  user_email?: string;
}
const labels: Record<string, string> = {
  manual_edit: "Balance updated",
  transaction_create: "Transaction recorded",
  transaction_update: "Transaction changed",
  transaction_delete: "Transaction removed",
  transaction_import: "Transactions imported",
  transfer: "Transfer",
  payment: "Payment recorded",
};
export function CashAccountActivity({
  kind,
  id,
}: {
  kind: CashKind;
  id: number;
}) {
  const [tab, setTab] = useState<"balances" | "transactions">("balances");
  return (
    <section className="nl-panel nl-cash-activity">
      <div className="nl-section-title">
        <div>
          <p className="nl-eyebrow">Follow the money</p>
          <h2>Account activity</h2>
        </div>
      </div>
      <div className="nl-account-tabs" aria-label="Account activity view">
        <button
          aria-pressed={tab === "balances"}
          onClick={() => setTab("balances")}
        >
          Balance changes
        </button>
        <button
          aria-pressed={tab === "transactions"}
          onClick={() => setTab("transactions")}
        >
          Transactions
        </button>
      </div>
      {tab === "balances" ? (
        <CashBalanceHistory kind={kind} id={id} />
      ) : (
        <CashTransactions kind={kind} id={id} />
      )}
    </section>
  );
}
function CashBalanceHistory({ kind, id }: { kind: CashKind; id: number }) {
  const [offset, setOffset] = useState(0);
  const resource = useBudgetResource<{
    records: CashAudit[];
    hasMore: boolean;
    total: number;
  }>(`${cashEndpoint(kind, id)}/audit?limit=20&offset=${offset}`, ["balances"]);
  const result = resource.data;
  const records = result?.records ?? [];
  const card = kind === "card";
  const chart = [...records].reverse().map((r) => ({
    time: new Date(r.created_at).getTime(),
    value: Number(card ? r.new_available_credit : r.new_balance),
  }));
  return (
    <>
      <p className="nl-account-explainer">
        {card
          ? "History tracks available credit as it was entered. It isn’t a history of amounts owed: your credit limit may have changed."
          : "These are recorded balance updates, not a running total of transactions. Import spending separately to update your envelopes."}
      </p>
      {chart.length > 1 && (
        <div
          className="nl-cash-chart"
          role="img"
          aria-label={`${card ? "Available credit" : "Recorded balance"} across these ${records.length} recorded changes. Exact amounts follow below.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chart}
              margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                domain={["dataMin", "dataMax"]}
                minTickGap={50}
                tick={{ fontSize: 11 }}
                stroke="var(--muted-foreground)"
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis
                width={68}
                tick={{ fontSize: 11 }}
                stroke="var(--muted-foreground)"
                tickFormatter={(v) =>
                  new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    notation: "compact",
                  }).format(v)
                }
              />
              <Tooltip
                labelFormatter={(v) => new Date(Number(v)).toLocaleString()}
                formatter={(v) => [
                  money(Number(v)),
                  card ? "Available credit" : "Balance",
                ]}
                contentStyle={{
                  background: "var(--popover)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              />
              <Line
                type="stepAfter"
                dataKey="value"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {records.length > 0 && (
        <p className="nl-muted nl-history-count">
          Changes {offset + 1}–{offset + records.length} of {result?.total} ·
          newest first
        </p>
      )}
      <div className="nl-cash-history">
        {records.map((r) => {
          const before = Number(card ? r.old_available_credit : r.old_balance),
            after = Number(card ? r.new_available_credit : r.new_balance),
            change = after - before;
          return (
            <article key={r.id}>
              <div>
                <h3>
                  {r.description || labels[r.change_type] || "Recorded change"}
                </h3>
                <p>
                  {new Date(r.created_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {r.user_email && (
                    <span className="nl-subtext">{r.user_email}</span>
                  )}
                </p>
                {r.transaction_id && (
                  <Link
                    className="nl-text-button"
                    href={`/new/transactions?transaction=${r.transaction_id}`}
                  >
                    View transaction →
                  </Link>
                )}
              </div>
              <div className="nl-cash-history-values">
                <strong>{money(after)}</strong>
                <span>
                  {money(before)} → {money(after)}
                </span>
                <small>
                  {change > 0
                    ? "Increased"
                    : change < 0
                      ? "Decreased"
                      : "Unchanged"}
                  {change !== 0 && ` by ${money(Math.abs(change))}`}
                </small>
              </div>
            </article>
          );
        })}
      </div>
      {!result && !resource.error && (
        <SkeletonRows
          kind="activity"
          count={4}
          label="Loading recorded balance changes"
        />
      )}
      {resource.error && (
        <p className="nl-error" role="alert">
          {resource.error}{" "}
          <button className="nl-text-button" onClick={resource.retry}>
            Try again
          </button>
        </p>
      )}
      {result && !records.length && (
        <div className="nl-account-empty">
          <h3>Your next balance change starts the history</h3>
          <p>
            Your current {card ? "available credit" : "balance"} is recorded
            above. Future changes appear here with the previous and new amounts.
          </p>
        </div>
      )}
      <div className="nl-form-actions">
        {offset > 0 && (
          <button
            className="nl-secondary"
            disabled={resource.loading}
            onClick={() => setOffset((n) => Math.max(0, n - 20))}
          >
            Newer changes
          </button>
        )}
        {result?.hasMore && (
          <button
            className="nl-secondary"
            disabled={resource.loading}
            onClick={() => setOffset((n) => n + 20)}
          >
            Older changes
          </button>
        )}
      </div>
    </>
  );
}
function CashTransactions({ kind, id }: { kind: CashKind; id: number }) {
  const resource = useBudgetResource<{
    transactions: TransactionWithSplits[];
    total: number;
  }>(
    `/api/transactions?page=1&pageSize=12&accountId=${kind}-${id}&sortBy=date&sortDirection=desc`,
    ["transactions"],
  );
  return (
    <>
      <div className="nl-account-explainer">
        <p>
          Recent imported or recorded transactions. These describe spending and
          income; they don’t calculate your live bank balance.
        </p>
        <Link
          className="nl-text-button"
          href={accountTransactionsHref(kind, id)}
        >
          All transactions & filters →
        </Link>
      </div>
      {!resource.data && !resource.error && (
        <SkeletonRows
          kind="transactions"
          count={5}
          label="Loading account transactions"
        />
      )}
      {resource.error && (
        <p className="nl-error" role="alert">
          {resource.error}{" "}
          <button className="nl-text-button" onClick={resource.retry}>
            Try again
          </button>
        </p>
      )}
      {resource.data && (
        <div className="nl-account-transactions">
          {resource.data.transactions.map((t) => (
            <Link
              key={t.id}
              href={`${accountTransactionsHref(kind, id)}&transaction=${t.id}`}
            >
              <div>
                <strong>{t.merchant_name || t.description}</strong>
                <span>
                  {parseLocalDate(t.date)?.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  ·{" "}
                  {t.splits
                    .map((s) => s.category_name)
                    .filter(Boolean)
                    .join(", ") || "No envelope"}
                </span>
                <small>{t.description}</small>
              </div>
              <TransactionFlowAmount
                amount={t.total_amount}
                transactionType={t.transaction_type}
              />
            </Link>
          ))}
          {!resource.data.transactions.length && (
            <div className="nl-account-empty">
              <h3>No transactions assigned here yet</h3>
              <p>
                Choose this account when importing your bank file, or assign it
                to an existing transaction.
              </p>
              <Link className="nl-secondary" href="/new/imports">
                Import transactions →
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
