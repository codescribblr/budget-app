"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Clock3,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { PendingCheck } from "@/lib/types";
import { cents, money, parseMoney } from "@/lib/new-look";
import { pendingEffect, pendingTotals } from "@/lib/pending-checks";
import { BudgetRequestError } from "@/lib/budget-request";
import { Switch } from "@/components/ui/switch";
import { DataBoundary, budgetRequest, useBudget } from "./budget-context";
import { PageHeading, ReadOnlyNotice } from "./common";
import { AccountNavigation } from "./account-navigation";
import { useBudgetResource } from "./use-budget-resource";
import { SkeletonRows, SkeletonSummary } from "./skeleton-sections";
import { SetupDialog } from "./setup-dialog";
import { guardedMetadata, useRecordGuard } from "./record-guard";
import { TransactionFlowAmount } from "./transaction-flow-amount";

export function GuidedPendingChecks() {
  const { data } = useBudget();
  return (
    <DataBoundary>
      <PendingContent
        key={`${data?.userId}:${data?.identity.activeAccountId}`}
      />
    </DataBoundary>
  );
}
function PendingContent() {
  const { data: budget, canEdit, refresh } = useBudget();
  const resource = useBudgetResource<PendingCheck[]>("/api/pending-checks", [
    "balances",
  ]);
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<PendingCheck | "new" | null>(null);
  const [removing, setRemoving] = useState<{
    item: PendingCheck;
    cleared: boolean;
  } | null>(null);
  const items = resource.data;
  const totals = items ? pendingTotals(items) : null;
  async function updated() {
    resource.retry();
    await refresh().catch(() =>
      toast.error(
        "Saved. Totals couldn’t refresh; reload before making more changes.",
      ),
    );
  }
  if (!budget) return null;
  return (
    <>
      <AccountNavigation />
      <PageHeading
        eyebrow="Accounts · between balances"
        title="Pending checks & deposits"
        description="Keep track of money that isn’t reflected in your recorded bank balances yet."
      >
        <button
          className="nl-primary"
          disabled={!canEdit || !items || !!resource.error}
          onClick={() => setEditing("new")}
        >
          <Plus size={17} />
          Add pending item
        </button>
      </PageHeading>
      <ReadOnlyNotice />
      <details className="nl-pending-intro nl-panel">
        <summary>How pending money affects your budget</summary>
        <div>
          <p>
            A check you’ve written reduces Available to save until it clears. A
            deposit adds to it immediately—use this only for money already
            received, never an expected paycheck.
          </p>
          <p className="nl-muted">
            These items don’t change account or envelope balances. Record or
            import the actual transaction once, separately.
          </p>
        </div>
      </details>
      {totals ? (
        <div className="nl-stat-grid nl-pending-summary">
          <div className="nl-panel">
            <p>Payments not yet in balances</p>
            <strong className="nl-negative">{money(totals.outgoing)}</strong>
            <small>Reserved from Available to save</small>
          </div>
          <div className="nl-panel">
            <p>Deposits not yet in balances</p>
            <strong className="nl-accent">{money(totals.incoming)}</strong>
            <small>Added to Available to save</small>
          </div>
          <div className="nl-panel">
            <p>Available to save</p>
            <strong>{money(budget.summary.current_savings)}</strong>
            <small>Already includes these adjustments</small>
          </div>
        </div>
      ) : (
        !resource.error && (
          <SkeletonSummary
            labels={[
              "Payments not yet in balances",
              "Deposits not yet in balances",
              "Available to save",
            ]}
          />
        )
      )}
      <div className="nl-section-title nl-pending-toolbar">
        <div className="nl-account-tabs" aria-label="Pending item filters">
          {[
            ["all", "All pending"],
            ["expense", "Payments"],
            ["income", "Deposits"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
              {items && (
                <span>
                  {
                    items.filter((i) => value === "all" || i.type === value)
                      .length
                  }
                </span>
              )}
            </button>
          ))}
        </div>
        <Link className="nl-text-button" href="/new/accounts">
          Update bank balances →
        </Link>
      </div>
      {resource.error && (
        <div role="alert" className="nl-notice">
          {resource.error}{" "}
          <button className="nl-text-button" onClick={resource.retry}>
            Try again
          </button>
        </div>
      )}
      {!items && !resource.error && (
        <SkeletonRows
          kind="activity"
          count={4}
          label="Loading pending checks and deposits"
        />
      )}
      {items && (
        <div className="nl-pending-list">
          {[...items]
            .filter((i) => filter === "all" || i.type === filter)
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map((item) => (
              <article key={item.id} className="nl-pending-row">
                <div
                  className={`nl-pending-icon ${item.type === "expense" ? "nl-negative" : "nl-accent"}`}
                >
                  {item.type === "expense" ? (
                    <ArrowUpRight size={21} />
                  ) : (
                    <ArrowDownLeft size={21} />
                  )}
                </div>
                <div className="nl-pending-description">
                  <h3>{item.description}</h3>
                  <p>
                    {item.type === "expense" ? "Payment" : "Deposit"} · Added{" "}
                    {new Date(item.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <small>
                    {item.type === "expense" ? "Reducing" : "Increasing"}{" "}
                    Available to save by {money(item.amount)}
                  </small>
                </div>
                <TransactionFlowAmount
                  amount={item.amount}
                  transactionType={item.type}
                />
                <div className="nl-pending-actions">
                  <button
                    className="nl-secondary"
                    disabled={!canEdit || !!resource.error}
                    onClick={() => setRemoving({ item, cleared: true })}
                  >
                    <Check size={15} />
                    Mark cleared
                  </button>
                  <button
                    className="nl-icon-button"
                    disabled={!canEdit || !!resource.error}
                    aria-label={`Edit ${item.description}`}
                    onClick={() => setEditing(item)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="nl-icon-button nl-negative"
                    disabled={!canEdit || !!resource.error}
                    aria-label={`Remove ${item.description}`}
                    onClick={() => setRemoving({ item, cleared: false })}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          {!items.some((i) => filter === "all" || i.type === filter) && (
            <div className="nl-panel nl-account-empty">
              <Check size={27} />
              <h2>
                {items.length
                  ? "Nothing pending in this view"
                  : "Nothing waiting to clear"}
              </h2>
              <p>
                {items.length
                  ? "Switch to All pending to see your other items."
                  : "Add a check when you write it if your recorded balance still includes that money. If your balances already reflect everything, there’s nothing to do here."}
              </p>
            </div>
          )}
        </div>
      )}
      <section className="nl-panel nl-clearing-guide">
        <h2>When an item clears</h2>
        <ol>
          <li>
            <strong>Check your bank.</strong> Make sure the payment or deposit
            is reflected in its balance.
          </li>
          <li>
            <strong>Update your recorded balance.</strong> Copy it into{" "}
            <Link href="/new/accounts">Cash & cards</Link> if you haven’t
            already.
          </li>
          <li>
            <strong>Mark it cleared here.</strong> That removes the temporary
            adjustment. Importing a transaction doesn’t clear this list
            automatically.
          </li>
        </ol>
      </section>
      {editing && (
        <PendingEditor
          key={editing === "new" ? "new" : editing.id}
          item={editing === "new" ? null : editing}
          latest={
            editing === "new"
              ? undefined
              : items?.find((i) => i.id === editing.id)
          }
          canEdit={canEdit && !resource.error}
          available={budget.summary.current_savings}
          onClose={() => setEditing(null)}
          onSaved={updated}
        />
      )}
      {removing && (
        <PendingRemoval
          item={removing.item}
          cleared={removing.cleared}
          latest={items?.find((i) => i.id === removing.item.id)}
          canEdit={canEdit && !resource.error}
          available={budget.summary.current_savings}
          onClose={() => setRemoving(null)}
          onSaved={updated}
        />
      )}
    </>
  );
}
function PendingEditor({
  item,
  latest,
  canEdit,
  available,
  onClose,
  onSaved,
}: {
  item: PendingCheck | null;
  latest?: PendingCheck;
  canEdit: boolean;
  available: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { data } = useBudget();
  const guard = useRecordGuard(
    item ? (latest ?? { ...item, recordMissing: true }) : null,
  );
  const [description, setDescription] = useState(item?.description ?? "");
  const [amount, setAmount] = useState(item ? String(item.amount) : "");
  const [type, setType] = useState<"expense" | "income">(
    item?.type ?? "expense",
  );
  const [acknowledged, setAcknowledged] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const value = parseMoney(amount);
  const dirty =
    description !== (item?.description ?? "") ||
    amount !== (item ? String(item.amount) : "") ||
    type !== (item?.type ?? "expense");
  const effectiveValue =
    item && latest && amount === String(item.amount) ? latest.amount : value;
  const effectiveType =
    item && latest && type === item.type ? latest.type : type;
  const after =
    effectiveValue !== null
      ? (cents(available) -
          cents(latest ? pendingEffect(latest) : 0) +
          cents(
            pendingEffect({ amount: effectiveValue, type: effectiveType }),
          )) /
        100
      : null;
  return (
    <SetupDialog
      title={
        item ? "Edit pending item" : "What hasn’t reached your balance yet?"
      }
      description="Keep a temporary adjustment until your recorded bank balance catches up."
      dirty={dirty}
      canEdit={canEdit && !uncertain}
      saveLabel={item ? "Save pending item" : "Add pending item"}
      onClose={onClose}
      onSave={async () => {
        if (!data) return;
        if (
          !description.trim() ||
          description.trim().length > 255 ||
          value === null ||
          value <= 0 ||
          value > 99999999.99
        )
          throw new Error(
            "Enter a description and a positive amount with no more than two decimal places.",
          );
        if (!item && !acknowledged)
          throw new Error(
            "Confirm that this money is not already reflected in your recorded balance.",
          );
        const patch = { description: description.trim(), amount: value, type };
        try {
          await guard.save(patch, (payload) =>
            budgetRequest(
              item ? `/api/pending-checks/${item.id}` : "/api/pending-checks",
              item
                ? payload
                : {
                    ...payload,
                    expectedBudgetId: data.identity.activeAccountId,
                  },
              item ? "PATCH" : "POST",
            ),
          );
        } catch (error) {
          if (
            !item &&
            (!(error instanceof BudgetRequestError) || error.status >= 500)
          )
            setUncertain(true);
          throw error;
        }
        toast.success(item ? "Pending item updated." : "Pending item added.");
        await onSaved();
      }}
    >
      {guard.notice}
      {uncertain && (
        <p className="nl-notice" role="alert">
          The save couldn’t be confirmed. Close this form and refresh the
          pending list before adding another item; it may already have saved.
        </p>
      )}
      <div className="nl-account-tabs" aria-label="Money direction">
        <button
          type="button"
          aria-pressed={type === "expense"}
          onClick={() => {
            setType("expense");
            setAcknowledged(false);
          }}
        >
          <ArrowUpRight size={16} />
          Payment
        </button>
        <button
          type="button"
          aria-pressed={type === "income"}
          onClick={() => {
            setType("income");
            setAcknowledged(false);
          }}
        >
          <ArrowDownLeft size={16} />
          Deposit
        </button>
      </div>
      <label>
        {type === "expense"
          ? "Who is this payment for?"
          : "Where did this money come from?"}
        <input
          autoFocus
          maxLength={255}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            type === "expense"
              ? "e.g., School trip · check #1042"
              : "e.g., Reimbursement check received"
          }
        />
      </label>
      <label>
        Amount
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
      </label>
      <div className="nl-setup-preview">
        <span>Available to save after saving</span>
        <strong>{after === null ? "—" : money(after)}</strong>
        <small>
          {type === "expense"
            ? "This reserves money from your available funds."
            : "This makes the deposit available to fund envelopes immediately. Don’t add income you haven’t received."}{" "}
          Account and envelope balances stay the same.
        </small>
      </div>
      {!item && (
        <label className="nl-switch-label">
          <Switch checked={acknowledged} onCheckedChange={setAcknowledged} />
          <span>
            {type === "expense"
              ? "This payment is not yet deducted from my recorded bank balance"
              : "I have received this money, and it is not yet included in my recorded bank balance"}
          </span>
        </label>
      )}
    </SetupDialog>
  );
}
function PendingRemoval({
  item,
  latest,
  cleared,
  canEdit,
  available,
  onClose,
  onSaved,
}: {
  item: PendingCheck;
  latest?: PendingCheck;
  cleared: boolean;
  canEdit: boolean;
  available: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { data, refresh } = useBudget();
  const [confirmed, setConfirmed] = useState(false);
  const stale = !latest || latest.revision !== item.revision;
  return (
    <SetupDialog
      destructive={!cleared}
      title={
        cleared
          ? "Is this reflected in your balance?"
          : "Remove this pending item?"
      }
      description={`${item.description} · ${money(item.amount)}`}
      dirty={confirmed}
      canEdit={canEdit && !stale}
      saveLabel={cleared ? "Mark cleared" : "Remove pending item"}
      onClose={onClose}
      onSave={async () => {
        if (!confirmed || !data)
          throw new Error("Confirm the details before continuing.");
        try {
          await budgetRequest(
            `/api/pending-checks/${item.id}`,
            guardedMetadata(item, data.identity.activeAccountId),
            "DELETE",
          );
        } catch (error) {
          await refresh().catch(() => {});
          throw error;
        }
        toast.success(
          cleared
            ? "Marked cleared. The temporary adjustment is removed."
            : "Pending item removed.",
        );
        await onSaved();
      }}
    >
      {stale && (
        <p className="nl-notice" role="alert">
          This item changed or was removed elsewhere. Close this dialog and
          review the current list.
        </p>
      )}
      <p>
        {cleared
          ? "First update your recorded bank balance to include this payment or deposit. Then remove its temporary adjustment here so it isn’t counted twice."
          : "Use this if the item was cancelled, entered twice, or no longer needs an adjustment."}
      </p>
      {cleared && (
        <Link href="/new/accounts" className="nl-secondary">
          Update account balances first →
        </Link>
      )}
      <div className="nl-setup-preview">
        <span>Available to save after removal</span>
        <strong>
          {money((cents(available) - cents(pendingEffect(item))) / 100)}
        </strong>
        <small>
          {item.type === "expense" ? "Releases" : "Removes"} the{" "}
          {money(item.amount)} adjustment. This does not create or delete a
          transaction or change any account or envelope balance.
        </small>
      </div>
      <label className="nl-switch-label">
        <Switch checked={confirmed} onCheckedChange={setConfirmed} />
        <span>
          {cleared
            ? "My recorded bank balance already reflects this item"
            : "This item no longer needs to adjust my available money"}
        </span>
      </label>
    </SetupDialog>
  );
}
