"use client";
import { useState } from "react";
import Link from "next/link";
import { CreditCard as CardIcon, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import type { CreditCard } from "@/lib/types";
import { getCreditCardBalanceOwed } from "@/lib/credit-card-balance";
import { carriedDebtPatch } from "@/lib/carried-debt";
import { localDate, money } from "@/lib/new-look";
import { budgetRequest, useBudget } from "./budget-context";
import { useRecordGuard } from "./record-guard";
import { SetupDialog } from "./setup-dialog";

export function CarriedDebt({
  card,
  compact = false,
}: {
  card: CreditCard;
  compact?: boolean;
}) {
  const { data, canEdit, refresh } = useBudget();
  const [editing, setEditing] = useState<CreditCard | null>(null);
  const latest = data?.cards.find((c) => c.id === card.id);
  const balance = card.carried_debt_balance;
  return (
    <section
      className={compact ? "nl-carried-row" : "nl-panel nl-carried-card"}
    >
      <div>
        <h2 className="nl-icon-heading">
          <CardIcon size={18} />
          {compact ? (
            <Link href={`/new/credit-cards/${card.id}`}>{card.name} →</Link>
          ) : (
            "Carried balance to repay"
          )}
        </h2>
        <strong className="nl-statement-amount">
          {balance == null
            ? "Not reviewed"
            : balance === 0
              ? "No carried balance"
              : money(balance)}
        </strong>
        <p className="nl-muted">
          {card.carried_debt_as_of
            ? `Recorded ${new Date(`${card.carried_debt_as_of}T12:00:00`).toLocaleDateString(undefined, { dateStyle: "medium" })}. Update after payments or your next statement.`
            : "A statement balance alone doesn’t tell us whether you carry debt."}
        </p>
      </div>
      <button
        className="nl-secondary"
        disabled={!canEdit || !latest}
        onClick={() => setEditing(card)}
      >
        {balance == null ? "Review this card" : "Update carried balance"}
        <ArrowUpRight size={15} />
      </button>
      {balance != null && balance > getCreditCardBalanceOwed(card) && (
        <p className="nl-notice">
          This carried amount is higher than the card’s recorded amount owed.
          Review both amounts; one may be out of date.
        </p>
      )}
      {!compact && (
        <p>
          This tracks debt you carry between billing cycles. Your day-to-day
          spending, Available to save, and net worth still use the card’s full
          recorded balance.
        </p>
      )}
      {editing && (
        <CarriedDebtEditor
          original={editing}
          latest={latest}
          canEdit={canEdit}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await refresh().catch(() =>
              toast.error("Saved. Reload to refresh your totals."),
            );
          }}
        />
      )}
    </section>
  );
}
function CarriedDebtEditor({
  original,
  latest,
  canEdit,
  onClose,
  onSaved,
}: {
  original: CreditCard;
  latest?: CreditCard;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const guard = useRecordGuard(latest ?? { ...original, recordMissing: true });
  const initialMode =
    original.carried_debt_balance == null
      ? "unknown"
      : original.carried_debt_balance > 0
        ? "carried"
        : "none";
  const [mode, setMode] = useState<"none" | "carried" | "unknown">(initialMode);
  const [amount, setAmount] = useState(
    String(original.carried_debt_balance ?? ""),
  );
  const [date, setDate] = useState(localDate());
  const dirty =
    mode !== initialMode ||
    amount !== String(original.carried_debt_balance ?? "") ||
    (mode !== "unknown" && date !== original.carried_debt_as_of);
  return (
    <SetupDialog
      title="Does this card carry debt?"
      description={original.name}
      dirty={dirty}
      canEdit={canEdit && !!latest}
      saveLabel="Save debt review"
      onClose={onClose}
      onSave={async () => {
        await guard.save(carriedDebtPatch(amount, date, mode), (p) =>
          budgetRequest(`/api/credit-cards/${original.id}`, p, "PATCH"),
        );
        toast.success(
          "Carried debt review saved. Account balances are unchanged.",
        );
        await onSaved();
      }}
    >
      {guard.notice}
      <p>
        Choose based on what happens after you make your statement payment—not
        whether the card shows a balance today.
      </p>
      <div className="nl-debt-choices">
        {(
          [
            [
              "none",
              "I pay the full statement balance",
              "New purchases may still show on your card. They aren’t carried debt.",
            ],
            [
              "carried",
              "I’m paying down a carried balance",
              "Some debt remains from earlier billing cycles, including a balance transfer.",
            ],
            [
              "unknown",
              "I haven’t checked yet",
              "Leave this card unclassified rather than guessing.",
            ],
          ] as const
        ).map(([value, title, detail]) => (
          <button
            type="button"
            key={value}
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
          >
            <strong>{title}</strong>
            <span>{detail}</span>
          </button>
        ))}
      </div>
      {mode === "carried" && (
        <>
          <label>
            Remaining carried balance
            <input
              autoFocus
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <p className="nl-muted">
            Enter the unpaid amount from earlier billing cycles after payments
            have posted, including interest or fees you still owe on it. Exclude
            new spending you plan to pay in full. If your provider doesn’t
            separate these, review the statement and payments before entering an
            amount.
          </p>
        </>
      )}
      {mode !== "unknown" && (
        <label>
          Reviewed as of
          <input
            type="date"
            max={localDate()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      )}
      <div className="nl-setup-preview">
        <strong>
          {mode === "unknown"
            ? "Not included in the payoff total"
            : mode === "none"
              ? "$0 carried debt"
              : "Included in Loans when “Include carried card debt” is on"}
        </strong>
        <small>
          This is a separate record, not a payment. Imports don’t update it
          automatically. It is never added to your net-worth debt a second time.
        </small>
      </div>
    </SetupDialog>
  );
}
