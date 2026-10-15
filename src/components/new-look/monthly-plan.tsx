"use client";
import { useTaskCheckin } from "./checkin-flow";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useFeatures } from "@/contexts/FeatureContext";
import { money, parseMoney, ordinaryEnvelopes, cents } from "@/lib/new-look";
import {
  useBudget,
  budgetRequest,
  DataBoundary,
  useUnsavedChanges,
} from "./budget-context";
import {
  PageHeading,
  TaskReturn,
  ReadOnlyNotice,
  CheckinFooter,
} from "./common";

export function GuidedPlan() {
  return (
    <DataBoundary>
      <PlanContent />
    </DataBoundary>
  );
}
function PlanContent() {
  const checkin = useTaskCheckin("plan");
  const { data, canEdit, refresh, refreshing } = useBudget();
  const { hasPremium, isFeatureEnabled } = useFeatures();
  const canEditAdvanced = hasPremium && isFeatureEnabled("category_types");
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const envelopes = ordinaryEnvelopes(data?.categories || []);
  const baseAmount = (c: (typeof envelopes)[number]) =>
    c.category_type === "accumulation"
      ? (c.annual_target ?? c.monthly_amount * 12)
      : c.monthly_amount;
  const changed = envelopes.filter(
    (c) =>
      !c.is_goal &&
      draft[c.id] !== undefined &&
      parseMoney(draft[c.id]) !== Math.round(baseAmount(c) * 100) / 100,
  );
  const invalid = changed.some(
    (c) => parseMoney(draft[c.id]) === null || parseMoney(draft[c.id])! < 0,
  );
  const total =
    envelopes.reduce((sum, c) => {
      const amount =
        draft[c.id] !== undefined ? parseMoney(draft[c.id]) : baseAmount(c);
      return (
        sum +
        cents(
          c.category_type === "accumulation"
            ? (amount ?? baseAmount(c)) / 12
            : (amount ?? c.monthly_amount),
        )
      );
    }, 0) / 100;
  useUnsavedChanges(changed.length > 0);
  if (!data) return null;
  async function save() {
    if (saving || invalid || !canEdit || !changed.length) return false;
    setSaving(true);
    setErrors({});
    const failures: Record<number, string> = {};
    let saved = 0;
    for (const c of changed) {
      const amount = parseMoney(draft[c.id])!;
      const body =
        c.category_type === "accumulation"
          ? { category_type: "accumulation", annual_target: amount }
          : {
              category_type: c.category_type || "monthly_expense",
              monthly_amount: amount,
            };
      try {
        await budgetRequest(`/api/categories/${c.id}`, body, "PATCH");
        saved++;
        setDraft((prev) => {
          const next = { ...prev };
          delete next[c.id];
          return next;
        });
      } catch (err) {
        failures[c.id] = err instanceof Error ? err.message : "Could not save";
      }
    }
    setErrors(failures);
    let refreshed = false;
    try {
      await refresh();
      refreshed = true;
    } catch {
      toast.error("Refresh failed. Reload before editing again.");
    }
    if (saved)
      toast.success(
        `${saved} funding ${saved === 1 ? "target" : "targets"} updated.`,
      );
    if (Object.keys(failures).length)
      toast.error("Some targets were not saved. Review the marked rows.");
    setSaving(false);
    return refreshed && Object.keys(failures).length === 0;
  }
  return (
    <>
      <TaskReturn task="plan" cadence="monthly" />
      <PageHeading
        eyebrow={checkin ? "Monthly · plan what matters" : "Your monthly plan"}
        title="A plan you can keep up with"
        description="Set your regular funding targets using what you’ve learned from real spending. Targets guide future allocations; editing them doesn’t move any money."
      >
        <Link
          className="nl-secondary"
          href={checkin ? "/new/reports?checkin=monthly" : "/new/reports"}
        >
          Review spending →
        </Link>
      </PageHeading>
      <ReadOnlyNotice />
      <div className="nl-stat-grid">
        <section className="nl-panel">
          <p>
            Monthly net income{" "}
            <Link
              href={checkin ? "/new/income?checkin=monthly" : "/new/income"}
            >
              · Edit income →
            </Link>
          </p>
          <strong>{money(data.summary.monthly_net_income)}</strong>
        </section>
        <section className="nl-panel">
          <p>Planned monthly funding</p>
          <strong>{money(total)}</strong>
        </section>
        <section className="nl-panel">
          <p>Income less plan</p>
          <strong
            className={
              total > data.summary.monthly_net_income ? "nl-negative" : ""
            }
          >
            {money(data.summary.monthly_net_income - total)}
          </strong>
        </section>
      </div>
      {!envelopes.length && (
        <div className="nl-panel">
          <h2>Start with your envelopes</h2>
          <p>Create categories for the things you want to fund, then set their monthly targets here.</p>
          <Link className="nl-secondary" href="/categories">Create envelopes in classic ↗</Link>
        </div>
      )}
      <div className="nl-table-wrap">
        <table className="nl-table">
          <thead>
            <tr>
              <th>Envelope</th>
              <th>Planning basis</th>
              <th className="nl-right">Monthly equivalent</th>
              <th className="nl-right">Funding target</th>
            </tr>
          </thead>
          <tbody>
            {envelopes.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.name}</strong>
                  {errors[c.id] && (
                    <p role="alert" className="nl-error">
                      {errors[c.id]}
                    </p>
                  )}
                </td>
                <td data-label="Planning basis">
                  {c.is_goal
                    ? "Linked to a goal"
                    : c.category_type === "accumulation"
                      ? "Annual amount ÷ 12"
                      : c.category_type === "target_balance"
                        ? "Monthly contribution to target"
                        : "Monthly expense"}
                  {c.category_type === "target_balance" && (
                    <span className="nl-subtext">
                      Balance target: {money(c.target_balance || 0)} · edit in
                      classic
                    </span>
                  )}
                </td>
                <td
                  data-label="Monthly equivalent"
                  className="nl-right nl-number"
                >
                  {money(
                    c.category_type === "accumulation"
                      ? (parseMoney(
                          draft[c.id] ?? Number(baseAmount(c)).toFixed(2),
                        ) ?? baseAmount(c)) / 12
                      : (parseMoney(
                          draft[c.id] ?? Number(c.monthly_amount).toFixed(2),
                        ) ?? c.monthly_amount),
                  )}
                </td>
                <td data-label="Funding target" className="nl-right">
                  {c.is_goal ? (
                    <Link href="/goals" className="nl-secondary">
                      Edit goal ↗
                    </Link>
                  ) : (
                    <>
                      <input
                        className="nl-money-input"
                        aria-label={`${c.name} ${c.category_type === "accumulation" ? "annual" : "monthly"} funding target`}
                        inputMode="decimal"
                        value={draft[c.id] ?? Number(baseAmount(c)).toFixed(2)}
                        disabled={
                          !canEdit ||
                          saving ||
                          (!canEditAdvanced &&
                            !!c.category_type &&
                            c.category_type !== "monthly_expense")
                        }
                        onChange={(e) =>
                          setDraft({ ...draft, [c.id]: e.target.value })
                        }
                      />
                      <span className="nl-subtext">
                        {c.category_type === "accumulation"
                          ? "per year"
                          : "per month"}
                      </span>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="nl-footnote">
        Annual expenses build gradually and can carry large balances
        intentionally. Goal contributions and category types are managed in
        classic for now. <Link href="/categories">Manage categories ↗</Link>
      </p>
      <CheckinFooter
        task="plan"
        cadence="monthly"
        title={
          changed.length
            ? `${changed.length} funding targets changed`
            : "Does the plan fit the month ahead?"
        }
        description={
          invalid
            ? "Enter valid nonnegative amounts with up to two decimals."
            : changed.length
              ? `Planned monthly funding: ${money(total)}. Existing envelope balances stay the same.`
              : "Review your income and targets. Continue when the plan reflects your priorities."
        }
        beforeComplete={changed.length ? save : undefined}
        saveLabel={changed.length ? "Save plan" : undefined}
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
                disabled={invalid || !canEdit || saving || refreshing}
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
