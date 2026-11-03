"use client";
import { CarriedDebt } from "./carried-debt";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CreditCard as CardIcon,
  Landmark,
  Pencil,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Account, CreditCard } from "@/lib/types";
import { money, cents, parseMoney, localDate } from "@/lib/new-look";
import { getCreditCardBalanceOwed } from "@/lib/credit-card-balance";
import { accountBudgetContribution } from "@/lib/budget-setup";
import { BudgetRequestError } from "@/lib/budget-request";
import { Switch } from "@/components/ui/switch";
import { DataBoundary, useBudget, budgetRequest } from "./budget-context";
import { AccountNavigation } from "./account-navigation";
import { AccountSetupEditor } from "./account-setup";
import { PageHeading, ReadOnlyNotice } from "./common";
import { SetupDialog } from "./setup-dialog";
import { guardedMetadata, useRecordGuard } from "./record-guard";
import {
  cashEndpoint,
  CashAccountActivity,
  accountTransactionsHref,
  type CashKind,
} from "./cash-account-activity";

export function GuidedCashAccountDetail({
  kind,
  id,
}: {
  kind: CashKind;
  id: number;
}) {
  const { data } = useBudget();
  return (
    <DataBoundary>
      <AccountDetail
        key={`${data?.userId}:${data?.identity.activeAccountId}:${kind}:${id}`}
        kind={kind}
        id={id}
      />
    </DataBoundary>
  );
}
function AccountDetail({ kind, id }: { kind: CashKind; id: number }) {
  const { data, canEdit, refresh } = useBudget();
  const [action, setAction] = useState<{
    type: "balance" | "statement" | "details" | "remove";
    record: Account | CreditCard;
  } | null>(null);
  if (!data) return null;
  const latest =
    kind === "card"
      ? data.cards.find((c) => c.id === id)
      : data.accounts.find((a) => a.id === id);
  const missing = !latest;
  const record = latest ?? action?.record;
  const editable = canEdit && !missing;
  if (!record)
    return (
      <>
        <AccountNavigation />
        <div className="nl-panel nl-account-empty">
          <h1>Account not available</h1>
          <p>It may have been removed, or it belongs to a different budget.</p>
          <Link href="/new/accounts" className="nl-secondary">
            Back to cash & cards
          </Link>
        </div>
      </>
    );
  const card = "credit_limit" in record ? record : null;
  const balance = card
    ? getCreditCardBalanceOwed(card)
    : (record as Account).balance;
  const cardCredit = card
    ? Math.max(
        0,
        (cents(card.available_credit) - cents(card.credit_limit)) / 100,
      )
    : 0;
  const contribution = accountBudgetContribution(
    kind,
    balance,
    record.include_in_totals,
  );
  const utilization =
    card && card.credit_limit > 0 ? (balance / card.credit_limit) * 100 : null;
  async function saved() {
    await refresh().catch(() =>
      toast.error("Saved. Refresh failed; reload before making more changes."),
    );
  }
  return (
    <>
      <AccountNavigation />
      <Link className="nl-cash-back" href="/new/accounts">
        <ArrowLeft size={15} />
        Cash & cards
      </Link>
      <PageHeading
        eyebrow={
          card
            ? "Your credit card"
            : `${(record as Account).account_type} account`
        }
        title={record.name}
        description={
          card
            ? "Keep what you owe clear, review changes, and find the purchases behind them."
            : "Know what’s here, keep the balance current, and review its history."
        }
      >
        <button
          className="nl-secondary"
          disabled={!editable}
          onClick={() => setAction({ type: "details", record })}
        >
          <Pencil size={16} />
          Edit details
        </button>
      </PageHeading>
      <ReadOnlyNotice />
      {missing && (
        <p className="nl-notice" role="alert">
          This account was removed elsewhere. Your open draft is retained, but
          you cannot save it. Close the editor to return to your accounts.
        </p>
      )}
      <div className="nl-cash-detail-grid">
        <div className="nl-cash-main">
          <section className="nl-panel nl-cash-hero">
            <div className="nl-cash-hero-top">
              <span className="nl-account-icon">
                {card ? <CardIcon size={23} /> : <Landmark size={23} />}
              </span>
              <span className="nl-tag">
                {record.include_in_totals
                  ? "Included in budget"
                  : "Tracking only"}
              </span>
            </div>
            <p className="nl-eyebrow">
              {card
                ? cardCredit > 0
                  ? "Card credit · nothing owed"
                  : "Calculated amount owed"
                : "Recorded balance"}
            </p>
            <div
              className={`nl-cash-amount ${balance < 0 ? "nl-negative" : ""}`}
            >
              {money(cardCredit || balance)}
            </div>
            <p className="nl-muted">
              {card
                ? `Based on ${money(card.credit_limit)} limit − ${money(card.available_credit)} available credit.`
                : "The balance you’ve recorded from your bank or cash on hand."}
            </p>
            <button
              className="nl-primary"
              disabled={!editable}
              onClick={() => setAction({ type: "balance", record })}
            >
              {card ? "Update available credit" : "Update balance"}
              <ArrowUpRight size={16} />
            </button>
            {card && (
              <div className="nl-cash-credit">
                <div>
                  <span>Available credit</span>
                  <strong>{money(card.available_credit)}</strong>
                </div>
                <div>
                  <span>Credit limit</span>
                  <strong>{money(card.credit_limit)}</strong>
                </div>
                <div
                  className="nl-credit-track"
                  role="meter"
                  aria-label="Credit limit used"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(100, Math.max(0, utilization ?? 0))}
                  aria-valuetext={
                    utilization === null
                      ? "No credit limit recorded"
                      : `${Math.round(utilization)} percent of credit limit used`
                  }
                >
                  <span
                    style={{
                      width: `${Math.min(100, Math.max(0, utilization ?? 0))}%`,
                    }}
                  />
                </div>
                <p>
                  {utilization === null
                    ? "Add a credit limit in Edit details to see how much is in use."
                    : `${Math.round(utilization)}% of your credit limit is in use${utilization > 100 ? " · over the recorded limit" : ""}.`}
                </p>
              </div>
            )}
          </section>
          <CashAccountActivity kind={kind} id={id} />
        </div>
        <aside className="nl-cash-aside">
          <section className="nl-panel">
            <h2 className="nl-icon-heading">
              <ShieldCheck size={18} />
              In your budget
            </h2>
            <p>
              {record.include_in_totals
                ? card
                  ? "Cash is reserved for what’s owed on this card when calculating Available to save."
                  : "This balance contributes to the cash available for your envelopes."
                : "You’re tracking this account, but its balance does not affect Available to save."}
            </p>
            <dl className="nl-cash-facts">
              <div>
                <dt>Effect on Available to save</dt>
                <dd>
                  {contribution > 0 ? "+" : contribution < 0 ? "−" : ""}
                  {money(Math.abs(contribution))}
                </dd>
              </div>
            </dl>
            {cardCredit > 0 && (
              <p className="nl-muted">
                A credit on the card does not become spendable cash in your
                budget.
              </p>
            )}
            <Link className="nl-text-button" href="/new/budget">
              Review envelopes →
            </Link>
          </section>
          {card && (
            <section className="nl-panel">
              <div className="nl-section-title">
                <h2>Last statement</h2>
                <button
                  className="nl-icon-button"
                  aria-label="Edit statement balance"
                  disabled={!editable}
                  onClick={() => setAction({ type: "statement", record })}
                >
                  <Pencil size={16} />
                </button>
              </div>
              <strong className="nl-statement-amount">
                {card.statement_balance === null
                  ? "Not recorded"
                  : money(card.statement_balance)}
              </strong>
              <p className="nl-muted">
                {card.statement_balance_as_of
                  ? `Statement dated ${new Date(`${card.statement_balance_as_of}T12:00:00`).toLocaleDateString(undefined, { dateStyle: "medium" })}. `
                  : ""}
                A statement can be paid in full and still show new purchases.
                This reference does not set carried debt or change today’s
                calculated amount owed or Available to save.
              </p>
            </section>
          )}
          {card && <CarriedDebt card={card} />}
          <section className="nl-panel nl-cash-shortcuts">
            <h2>Keep this account current</h2>
            <Link href={accountTransactionsHref(kind, id)}>
              Find a transaction <span>→</span>
            </Link>
            <Link href="/new/imports">
              Import a bank file <span>→</span>
            </Link>
            <Link href="/new/pending-checks">
              Pending checks & deposits <span>→</span>
            </Link>
            <p className="nl-muted">
              Imports update your spending in envelopes. Keep your bank balance
              current separately.
            </p>
          </section>
          <details className="nl-panel nl-account-manage">
            <summary>Manage this account</summary>
            <p>
              If you just want to stop using this balance in your budget, turn
              off “Include in my budget” in Edit details. That keeps its
              history.
            </p>
            <button
              className="nl-secondary"
              disabled={!editable}
              onClick={() => setAction({ type: "details", record })}
            >
              Change budget inclusion
            </button>
            <button
              className="nl-text-button nl-negative"
              disabled={!editable}
              onClick={() => setAction({ type: "remove", record })}
            >
              <Trash2 size={15} />
              Remove account permanently
            </button>
          </details>
        </aside>
      </div>
      {action?.type === "details" && (
        <AccountSetupEditor
          selection={
            "credit_limit" in action.record
              ? { kind: "card", item: action.record }
              : { kind: "account", item: action.record }
          }
          latest={latest}
          availableToSave={data.summary.current_savings}
          canEdit={editable}
          onClose={() => setAction(null)}
          onSave={async (payload, revision) => {
            if (!revision)
              throw new Error("Reload the account before saving safely.");
            try {
              await budgetRequest(
                cashEndpoint(kind, id),
                {
                  ...payload,
                  expectedRevision: revision,
                  expectedBudgetId: data.identity.activeAccountId,
                },
                "PATCH",
              );
            } catch (error) {
              if (
                error instanceof BudgetRequestError &&
                error.code === "STALE_RECORD"
              )
                await refresh().catch(() => {});
              throw error;
            }
            toast.success("Account details saved.");
            await saved();
          }}
        />
      )}
      {action && (action.type === "balance" || action.type === "statement") && (
        <CashBalanceEditor
          key={action.type}
          record={record}
          original={action.record}
          kind={kind}
          mode={action.type}
          canEdit={editable}
          onClose={() => setAction(null)}
          onSaved={saved}
        />
      )}
      {action?.type === "remove" && (
        <CashAccountRemoval
          record={action.record}
          latest={latest}
          kind={kind}
          onClose={() => setAction(null)}
        />
      )}
    </>
  );
}
function CashBalanceEditor({
  original,
  record,
  kind,
  mode,
  canEdit,
  onClose,
  onSaved,
}: {
  original: Account | CreditCard;
  record: Account | CreditCard;
  kind: CashKind;
  mode: "balance" | "statement";
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { data } = useBudget();
  const guard = useRecordGuard(record);
  const card = "credit_limit" in original ? original : null;
  const originalValue =
    mode === "statement"
      ? card?.statement_balance
      : card
        ? card.available_credit
        : (original as Account).balance;
  const [amount, setAmount] = useState(
    originalValue == null ? "" : String(originalValue),
  );
  const [date, setDate] = useState(card?.statement_balance_as_of ?? "");
  const value = amount.trim() ? parseMoney(amount) : null;
  const statement = mode === "statement";
  const dirty =
    amount !== (originalValue == null ? "" : String(originalValue)) ||
    (statement && date !== (card?.statement_balance_as_of ?? ""));
  const current =
    "credit_limit" in record
      ? getCreditCardBalanceOwed(record)
      : record.balance;
  const next =
    card && "credit_limit" in record && value !== null
      ? Math.max(0, (cents(record.credit_limit) - cents(value)) / 100)
      : value;
  const after =
    data && next !== null
      ? data.summary.current_savings -
        accountBudgetContribution(kind, current, record.include_in_totals) +
        accountBudgetContribution(kind, next, record.include_in_totals)
      : null;
  return (
    <SetupDialog
      title={
        statement
          ? "Record the last statement"
          : card
            ? "Update available credit"
            : "Update recorded balance"
      }
      description={original.name}
      dirty={dirty}
      canEdit={canEdit}
      saveLabel={statement ? "Save statement reference" : "Save balance"}
      onClose={onClose}
      onSave={async () => {
        if (
          (!statement || amount.trim()) &&
          (value === null || Math.abs(value) > 99999999.99)
        )
          throw new Error(
            "Enter a valid amount with no more than two decimal places.",
          );
        if (statement && value !== null && value < 0)
          throw new Error("Enter zero or a positive statement balance.");
        if (statement && date && (value === null || date > localDate()))
          throw new Error(
            "Enter a statement balance and a statement date no later than today, or clear both fields.",
          );
        const patch = statement
          ? { statement_balance: value, statement_balance_as_of: date || null }
          : card
            ? { available_credit: value }
            : { balance: value };
        await guard.save(patch, (payload) =>
          budgetRequest(cashEndpoint(kind, original.id), payload, "PATCH"),
        );
        toast.success(
          statement ? "Statement reference saved." : "Balance updated.",
        );
        await onSaved();
      }}
    >
      {guard.notice}
      <label>
        {statement
          ? "Statement balance (optional)"
          : card
            ? "Available credit shown by your card provider"
            : "Current bank or cash balance"}
        <input
          autoFocus
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      {statement ? (
        <>
          <label>
            Statement date (optional)
            <input
              type="date"
              max={localDate()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <p className="nl-muted">
            For reference and statement-based debt goals. This does not record a
            payment or update available credit. Clear both fields to remove the
            reference.
          </p>
        </>
      ) : (
        <>
          {card && (
            <div className="nl-setup-preview">
              <span>Calculated amount owed</span>
              <strong>{next === null ? "—" : money(next)}</strong>
              <small>
                Credit limit{" "}
                {money(
                  "credit_limit" in record
                    ? record.credit_limit
                    : card.credit_limit,
                )}{" "}
                minus available credit. An amount above your limit means a card
                credit.
              </small>
            </div>
          )}
          <div className="nl-setup-preview">
            <span>Available to save after saving</span>
            <strong>{after === null ? "—" : money(after)}</strong>
            <small>
              Envelope balances stay the same. Import your transactions
              separately.
            </small>
          </div>
        </>
      )}
    </SetupDialog>
  );
}
function CashAccountRemoval({
  record,
  latest,
  kind,
  onClose,
}: {
  record: Account | CreditCard;
  latest?: Account | CreditCard;
  kind: CashKind;
  onClose: () => void;
}) {
  const { data, canEdit, refresh } = useBudget();
  const router = useRouter();
  const [name, setName] = useState("");
  const stale = !latest || record.revision !== latest.revision;
  const contribution = accountBudgetContribution(
    kind,
    "credit_limit" in record
      ? getCreditCardBalanceOwed(record)
      : record.balance,
    record.include_in_totals,
  );
  return (
    <SetupDialog
      destructive
      title="Remove this account permanently?"
      description={record.name}
      dirty={!!name}
      canEdit={canEdit && !stale}
      saveLabel="Remove account"
      onClose={onClose}
      onSave={async () => {
        if (!data || name !== record.name)
          throw new Error("Type the account name exactly to confirm removal.");
        try {
          await budgetRequest(
            cashEndpoint(kind, record.id),
            guardedMetadata(record, data.identity.activeAccountId),
            "DELETE",
          );
        } catch (error) {
          await refresh().catch(() => {});
          throw error;
        }
        toast.success("Account removed. Transactions and envelopes were kept.");
        await refresh().catch(() => {});
        router.push("/new/accounts");
      }}
    >
      {stale && (
        <p className="nl-notice" role="alert">
          This account changed elsewhere. Close this dialog and review it before
          removing it.
        </p>
      )}
      <p>
        Removing an account deletes its recorded balance history. Saved
        transactions stay in your budget but lose their link to this account.
        Envelopes keep their money.
      </p>
      <p>
        Linked goals and import settings will lose this account as a source.
        Review those links first. If you simply closed the account, you can keep
        its history by changing its balance and turning off “Include in my
        budget” instead.
      </p>
      <div className="nl-form-actions">
        <Link className="nl-text-button" href="/new/goals">
          Review goals →
        </Link>
        <Link className="nl-text-button" href="/new/imports">
          Review imports →
        </Link>
      </div>
      <div className="nl-setup-preview">
        <span>Available to save after removal</span>
        <strong>
          {data ? money(data.summary.current_savings - contribution) : "—"}
        </strong>
      </div>
      <label>
        Type “{record.name}” to confirm
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
        />
      </label>
    </SetupDialog>
  );
}
