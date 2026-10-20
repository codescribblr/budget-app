"use client";
import { AccountNavigation } from "./account-navigation";
import { useTaskCheckin } from "./checkin-flow";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { money, parseMoney, cents } from "@/lib/new-look";
import { getCreditCardBalanceOwed } from "@/lib/credit-card-balance";
import {
  useBudget,
  DataBoundary,
  budgetRequest,
  useUnsavedChanges,
} from "./budget-context";
import {
  PageHeading,
  TaskReturn,
  CheckinFooter,
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
  const checkin = useTaskCheckin("accounts");
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
          owed: 0,
        })),
        ...data.cards.map((c) => ({
          key: `card-${c.id}`,
          id: c.id,
          name: c.name,
          kind: "card" as const,
          label: "Credit card",
          value: c.available_credit,
          included: c.include_in_totals,
          limit: c.credit_limit,
          owed: getCreditCardBalanceOwed(c),
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
          ? cents(r.owed) - Math.max(0, cents(r.limit) - cents(value))
          : cents(value) - cents(r.value))
      );
    }, 0) / 100;
  async function save() {
    if (saving || invalid || !canEdit || !changed.length) return false;
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
            ? { available_credit: amount }
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
    let refreshed = false;
    try {
      await refresh();
      refreshed = true;
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
    return refreshed && Object.keys(failed).length === 0;
  }
  return (
    <>
      <TaskReturn task="accounts" cadence="daily" />
      <AccountNavigation />
      <PageHeading
        eyebrow={
          checkin
            ? "Daily · refresh the picture"
            : "Accounts · keep balances current"
        }
        title="One balance pass. All your accounts."
        description="Check your bank balances, then copy the available credit shown for each card. We’ll calculate what’s owed. Import transactions separately to update spending in your envelopes."
      >
        <div className="nl-checkin-actions">
          <Link
            className="nl-secondary"
            href={
              checkin
                ? "/new/accounts/manage?from=daily"
                : "/new/accounts/manage"
            }
          >
            Set up accounts & cards →
          </Link>
        </div>
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
      {(["account", "card"] as const).map(
        (kind) =>
          rows.some((row) => row.kind === kind) && (
            <section
              className="nl-balance-section"
              key={kind}
              aria-labelledby={`${kind}-balances-heading`}
            >
              <div className="nl-section-title">
                <h2 id={`${kind}-balances-heading`}>
                  {kind === "card" ? "Credit cards" : "Bank & cash accounts"}
                </h2>
                {kind === "card" && (
                  <Link
                    href={
                      checkin
                        ? "/new/accounts/manage?from=daily"
                        : "/new/accounts/manage"
                    }
                  >
                    Edit card details & limits →
                  </Link>
                )}
              </div>
              {kind === "card" && (
                <p id="card-entry-help" className="nl-balance-help">
                  Enter <strong>available credit</strong> exactly as your card
                  provider shows it. Amount owed = credit limit − available
                  credit. Check the saved limit below if it has changed.
                </p>
              )}
              <div className="nl-table-wrap">
                <table className="nl-table">
                  <caption className="sr-only">
                    {kind === "card"
                      ? "Credit limits, calculated amounts owed, and available credit"
                      : "Bank and cash account balances"}
                  </caption>
                  <thead>
                    <tr>
                      <th>{kind === "card" ? "Card" : "Account"}</th>
                      <th>
                        {kind === "card"
                          ? "Credit limit"
                          : "Included in totals"}
                      </th>
                      <th className="nl-right">
                        {kind === "card"
                          ? "Calculated owed"
                          : "Recorded balance"}
                      </th>
                      <th className="nl-right">
                        {kind === "card"
                          ? "Available credit now"
                          : "Balance now"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows
                      .filter((row) => row.kind === kind)
                      .map((row) => {
                        const entered = parseMoney(
                          draft[row.key] ?? Number(row.value).toFixed(2),
                        );
                        const owed =
                          entered === null
                            ? null
                            : (cents(row.limit) - cents(entered)) / 100;
                        return (
                          <tr key={row.key}>
                            <td>
                              <strong>{row.name}</strong>
                              <span className="nl-subtext">
                                {row.kind === "card"
                                  ? row.included
                                    ? "Included in totals"
                                    : "Excluded from totals"
                                  : row.label}
                              </span>
                              {errors[row.key] && (
                                <span role="alert" className="nl-error">
                                  {errors[row.key]}
                                </span>
                              )}
                            </td>
                            <td
                              data-label={
                                kind === "card"
                                  ? "Credit limit"
                                  : "Included in totals"
                              }
                            >
                              {kind === "card" ? (
                                <span className="nl-number">
                                  {money(row.limit)}
                                </span>
                              ) : (
                                <span className="nl-tag">
                                  {row.included ? "Included" : "Excluded"}
                                </span>
                              )}
                            </td>
                            <td
                              data-label={
                                kind === "card"
                                  ? "Calculated owed"
                                  : "Recorded balance"
                              }
                              className="nl-right nl-number"
                            >
                              {kind === "card" ? (
                                owed === null ? (
                                  "—"
                                ) : owed < 0 ? (
                                  <>
                                    {money(Math.abs(owed))}
                                    <span className="nl-subtext">
                                      Card credit · nothing owed
                                    </span>
                                  </>
                                ) : (
                                  money(owed)
                                )
                              ) : (
                                money(row.value)
                              )}
                              {kind === "card" &&
                                entered !== null &&
                                owed !== null &&
                                owed >= 0 && (
                                  <span className="nl-subtext">
                                    {money(row.limit)} − {money(entered)}
                                  </span>
                                )}
                            </td>
                            <td
                              data-label={
                                kind === "card"
                                  ? "Available credit now"
                                  : "Balance now"
                              }
                              className="nl-right"
                            >
                              <input
                                className="nl-money-input"
                                aria-label={`${row.name} ${row.kind === "card" ? "available credit now" : "balance now"}`}
                                aria-describedby={
                                  kind === "card"
                                    ? "card-entry-help"
                                    : undefined
                                }
                                aria-invalid={
                                  draft[row.key] !== undefined &&
                                  parseMoney(draft[row.key]) === null
                                }
                                inputMode="decimal"
                                onFocus={(e) => e.target.select()}
                                value={
                                  draft[row.key] ?? Number(row.value).toFixed(2)
                                }
                                disabled={!canEdit || saving}
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    [row.key]: e.target.value,
                                  })
                                }
                              />
                              {kind === "card" && (
                                <span className="nl-subtext">
                                  Recorded: {money(row.value)} available
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>
          ),
      )}
      {!rows.length && (
        <div className="nl-panel">
          <h2>Add your first account</h2>
          <p>
            Set up a bank, cash account, or credit card, then return here for
            your daily balance pass.
          </p>
          <Link
            href={
              checkin
                ? "/new/accounts/manage?from=daily"
                : "/new/accounts/manage"
            }
            className="nl-primary"
          >
            Add an account →
          </Link>
        </div>
      )}
      <p className="nl-footnote">
        Card calculations use your saved credit limit and the available credit
        reported by your provider. Pending charges and holds depend on what your
        provider includes. Excluded accounts stay outside available-to-save
        totals.
      </p>
      <AvailableCalculation />
      <CheckinFooter
        task="accounts"
        cadence="daily"
        title={
          changed.length
            ? `${changed.length} ${changed.length === 1 ? "balance" : "balances"} changed`
            : "Balances checked?"
        }
        description={
          invalid
            ? "Use amounts with up to two decimal places."
            : changed.length
              ? `Available to save after saving: ${money(data.summary.current_savings + delta)}`
              : "Continue when these match what your banks and cards show. No changes needed? You can still move on."
        }
        beforeComplete={changed.length ? save : undefined}
        saveLabel={changed.length ? "Save balances" : undefined}
        disabled={
          saving || refreshing || invalid || (changed.length > 0 && !canEdit)
        }
      >
        {changed.length > 0 && (
          <>
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
            {checkin && (
              <button
                className="nl-secondary"
                disabled={saving || refreshing || invalid || !canEdit}
                onClick={() => void save()}
              >
                Save & stay
              </button>
            )}
          </>
        )}
      </CheckinFooter>
    </>
  );
}
