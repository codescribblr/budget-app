"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { money, parseMoney, cents } from "@/lib/new-look";
import {
  useBudget,
  DataBoundary,
  budgetRequest,
  useUnsavedChanges,
} from "./budget-context";
import {
  PageHeading,
  TaskReturn,
  ReadOnlyNotice,
  AvailableCalculation,
} from "./common";

export function GuidedAccounts() {
  return (
    <DataBoundary>
      <AccountsContent />
    </DataBoundary>
  );
}
function AccountsContent() {
  const { data, canEdit, refresh, refreshing } = useBudget();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const rows = data
    ? [
        ...data.accounts.map((a) => ({
          key: `account-${a.id}`,
          id: a.id,
          name: a.name,
          kind: "account" as const,
          label: a.account_type,
          value: a.balance,
          included: a.include_in_totals,
          limit: 0,
        })),
        ...data.cards.map((c) => ({
          key: `card-${c.id}`,
          id: c.id,
          name: c.name,
          kind: "card" as const,
          label: "Credit card · current amount owed",
          value: c.current_balance ?? c.credit_limit - c.available_credit,
          included: c.include_in_totals,
          limit: c.credit_limit,
        })),
      ]
    : [];
  const changed = rows.filter(
    (r) => draft[r.key] !== undefined && parseMoney(draft[r.key]) !== r.value,
  );
  const invalid = changed.some((r) => parseMoney(draft[r.key]) === null);
  useUnsavedChanges(changed.length > 0);
  if (!data) return null;
  const delta =
    changed.reduce((sum, r) => {
      const value = parseMoney(draft[r.key]);
      if (value === null || !r.included) return sum;
      return (
        sum +
        (r.kind === "card"
          ? cents(Math.max(0, r.value)) - cents(Math.max(0, value))
          : cents(value) - cents(r.value))
      );
    }, 0) / 100;
  async function save() {
    if (saving || invalid || !canEdit || !changed.length) return;
    setSaving(true);
    setErrors({});
    const failed: Record<string, string> = {};
    let saved = 0;
    for (const row of changed) {
      const amount = parseMoney(draft[row.key])!;
      try {
        await budgetRequest(
          `/api/${row.kind === "card" ? "credit-cards" : "accounts"}/${row.id}`,
          row.kind === "card"
            ? { available_credit: (cents(row.limit) - cents(amount)) / 100 }
            : { balance: amount },
          "PATCH",
        );
        saved++;
        setDraft((prev) => {
          const next = { ...prev };
          delete next[row.key];
          return next;
        });
      } catch (err) {
        failed[row.key] = err instanceof Error ? err.message : "Could not save";
      }
    }
    setErrors(failed);
    try {
      await refresh();
    } catch {
      toast.error("Refresh failed. Reload before making more changes.");
    }
    if (saved)
      toast.success(
        `${saved} ${saved === 1 ? "balance" : "balances"} updated.`,
      );
    if (Object.keys(failed).length)
      toast.error(
        "Some balances could not be saved. Check the marked rows before retrying.",
      );
    setSaving(false);
  }
  return (
    <>
      <TaskReturn task="accounts" cadence="daily" />
      <PageHeading
        eyebrow="Daily · refresh the picture"
        title="One balance pass. All your accounts."
        description="Enter what your banks and cards show now. These updates keep available to save current; import transactions separately to update spending in your envelopes."
      >
        <Link className="nl-secondary" href="/accounts">
          Manage accounts in classic ↗
        </Link>
      </PageHeading>
      <ReadOnlyNotice />
      <div className="nl-stat-grid">
        <div className="nl-panel">
          <p>Recorded cash</p>
          <strong>{money(data.summary.total_monies)}</strong>
        </div>
        <div className="nl-panel">
          <p>Credit cards owed</p>
          <strong>{money(data.summary.total_credit_card_balances)}</strong>
        </div>
        <div className="nl-panel">
          <p>Available to save</p>
          <strong>{money(data.summary.current_savings)}</strong>
        </div>
      </div>
      <div className="nl-table-wrap">
        <table className="nl-table">
          <caption className="sr-only">
            Account balances and current credit card amounts owed
          </caption>
          <thead>
            <tr>
              <th>Account</th>
              <th>Included in totals</th>
              <th className="nl-right">Recorded balance</th>
              <th className="nl-right">Balance now</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>
                  <strong>{row.name}</strong>
                  <span className="nl-subtext">{row.label}</span>
                  {errors[row.key] && (
                    <span role="alert" className="nl-error">
                      {errors[row.key]}
                    </span>
                  )}
                </td>
                <td data-label="Included in totals">
                  <span className="nl-tag">
                    {row.included ? "Included" : "Excluded"}
                  </span>
                </td>
                <td
                  data-label="Recorded balance"
                  className="nl-right nl-number"
                >
                  {money(row.value)}
                </td>
                <td data-label="Balance now" className="nl-right">
                  <input
                    className="nl-money-input"
                    aria-label={`${row.name} ${row.kind === "card" ? "current amount owed" : "balance now"}`}
                    aria-invalid={
                      draft[row.key] !== undefined &&
                      parseMoney(draft[row.key]) === null
                    }
                    inputMode="decimal"
                    onFocus={(e) => e.target.select()}
                    value={draft[row.key] ?? Number(row.value).toFixed(2)}
                    disabled={!canEdit || saving}
                    onChange={(e) =>
                      setDraft({ ...draft, [row.key]: e.target.value })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <div className="nl-panel">
          <h2>Add your first account</h2>
          <p>
            Set up a bank, cash account, or credit card in classic, then return
            here for your daily balance pass.
          </p>
          <Link href="/accounts" className="nl-primary">
            Add an account →
          </Link>
        </div>
      )}
      <p className="nl-footnote">
        For cards, enter the current amount owed, not the statement balance or
        available credit. Use a negative amount for a card credit. Excluded
        accounts stay outside available-to-save totals.{" "}
        <Link href="/credit-cards">Manage cards in classic ↗</Link>
      </p>
      {changed.length > 0 && (
        <div className="nl-savebar">
          <div>
            <strong>
              {changed.length} {changed.length === 1 ? "balance" : "balances"}{" "}
              changed
            </strong>
            <p>
              {invalid
                ? "Use amounts with up to two decimal places."
                : `Available to save after saving: ${money(data.summary.current_savings + delta)}`}
            </p>
          </div>
          <div>
            <button
              className="nl-secondary"
              disabled={saving}
              onClick={() => {
                setDraft({});
                setErrors({});
              }}
            >
              Discard
            </button>
            <button
              className="nl-primary"
              disabled={saving || refreshing || invalid || !canEdit}
              onClick={save}
            >
              {saving ? "Saving…" : "Save balance updates"}
            </button>
          </div>
        </div>
      )}
      <AvailableCalculation />
    </>
  );
}
