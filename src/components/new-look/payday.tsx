"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useFeatures } from "@/contexts/FeatureContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { DashboardSummary } from "@/lib/types";
import {
  cents,
  localDate,
  money,
  ordinaryEnvelopes,
  parseMoney,
  suggestAllocation,
  remainingFunding,
} from "@/lib/new-look";
import {
  budgetRequest,
  useBudget,
  DataBoundary,
  useUnsavedChanges,
} from "./budget-context";
import { PageHeading, ReadOnlyNotice } from "./common";

export function GuidedPayday() {
  return (
    <DataBoundary>
      <PaydayContent />
    </DataBoundary>
  );
}
function PaydayContent() {
  const { data, canEdit, refresh, refreshing } = useBudget();
  const { isFeatureEnabled, hasPremium } = useFeatures();
  const suggestionsEnabled = hasPremium && isFeatureEnabled("smart_allocation");
  const [limit, setLimit] = useState("");
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{
    amount: number;
    tracked: boolean;
  } | null>(null);
  const envelopes = ordinaryEnvelopes(data?.categories || []);
  const allocations = envelopes.map((c) => ({
    categoryId: c.id,
    amount: parseMoney(draft[c.id] ?? "0"),
  }));
  const total =
    allocations.reduce((sum, a) => sum + cents(a.amount || 0), 0) / 100;
  const cap = parseMoney(limit);
  const available = Math.max(0, data?.summary.current_savings ?? 0);
  const exceedsAvailable = cap !== null && cents(cap) > cents(available);
  const invalid = allocations.some((a) => a.amount === null || a.amount < 0);
  const valid = Boolean(
    data &&
    cap !== null &&
    cap > 0 &&
    !invalid &&
    total > 0 &&
    cents(total) <= cents(cap) &&
    cents(total) <= cents(data.summary.current_savings),
  );
  useUnsavedChanges(
    Object.values(draft).some(
      (value) => value !== "" && value !== "0" && value !== "0.00",
    ),
  );
  if (!data) return null;
  async function apply() {
    if (!valid || saving || !canEdit) return;
    setSaving(true);
    setError("");
    try {
      // A fresh total catches common cross-tab changes before posting. The shared API
      // remains authoritative; atomic/concurrent-write protection is a separate rollout gate.
      const current = await budgetRequest<DashboardSummary>("/api/dashboard");
      if (
        cents(current.current_savings) !== cents(data!.summary.current_savings)
      ) {
        setPreview(false);
        await refresh();
        setError(
          "Available to save changed since this preview. Review the refreshed totals before allocating.",
        );
        return;
      }
      const result = await budgetRequest<{ fundingTracked: boolean }>(
        "/api/allocations/batch",
        {
          allocations: allocations.filter(
            (a) => a.amount !== null && a.amount > 0,
          ),
          month: `${localDate().slice(0, 7)}-01`,
        },
      );
      setReceipt({ amount: total, tracked: result.fundingTracked });
      setDraft({});
      setPreview(false);
      setLimit("");
      if (result.fundingTracked) toast.success("Paycheck allocation saved.");
      else
        toast.warning(
          "Balances updated, but monthly funding was not recorded. Do not allocate this money again.",
        );
    } catch (err) {
      setPreview(false);
      setError(
        `${err instanceof Error ? err.message : "Allocation could not be confirmed."} The result may be uncertain. Check balances and funding history before entering another allocation.`,
      );
      // Never automatically retry a financial write with an unknown outcome.
      setDraft({});
    } finally {
      try {
        await refresh();
      } catch {
        toast.error("Refresh failed. Reload before allocating again.");
      }
      setSaving(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="When you get paid"
        title="Give this paycheck a job"
        description="Allocate money already reflected in your account balances. Your monthly plan guides the choices; you decide what gets funded now."
      >
        <Link className="nl-secondary" href="/new/accounts">
          Update balances first →
        </Link>
      </PageHeading>
      <ReadOnlyNotice />
      {receipt && (
        <div className="nl-notice" role="status">
          <strong>{money(receipt.amount)} allocated.</strong>{" "}
          {receipt.tracked
            ? "Envelope balances and this month’s funding have been updated."
            : "Envelope balances changed, but monthly funding could not be recorded. Review the funding history in classic before making another allocation; do not submit this amount again."}
        </div>
      )}
      {error && (
        <p role="alert" className="nl-error">
          {error}
        </p>
      )}
      <div className="nl-two-column">
        <section className="nl-panel nl-form">
          <h2>1. Choose how much to allocate</h2>
          <label>
            Amount to allocate
            <input
              inputMode="decimal"
              placeholder="0.00"
              value={limit}
              aria-describedby="payday-amount-help"
              disabled={!canEdit || saving}
              onChange={(e) => {
                setLimit(e.target.value);
                setReceipt(null);
              }}
            />
          </label>
          <div id="payday-amount-help" aria-live="polite">
            {exceedsAvailable ? (
              <p className="nl-notice">
                You have {money(available)} available to allocate.{" "}
                <Link
                  className="underline underline-offset-2"
                  href="/new/accounts"
                >
                  Update your account balances
                </Link>{" "}
                if your paycheck has arrived.
              </p>
            ) : (
              <small>
                You can allocate up to {money(available)} from your recorded
                available-to-save money. Any amount left over stays available to
                save.
              </small>
            )}
          </div>
        </section>
        <section className="nl-panel">
          <p className="nl-eyebrow">Your funding picture</p>
          <dl className="nl-metrics">
            <div>
              <dt>Available to save now</dt>
              <dd>{money(data.summary.current_savings)}</dd>
            </div>
            <div>
              <dt>This allocation</dt>
              <dd>{money(total)}</dd>
            </div>
            <div>
              <dt>Available to save after</dt>
              <dd
                className={
                  total > data.summary.current_savings ? "nl-negative" : ""
                }
              >
                {money(data.summary.current_savings - total)}
              </dd>
            </div>
          </dl>
          <p>
            Allocating changes envelope balances and monthly funding. It doesn’t
            record a deposit or change bank balances.
          </p>
        </section>
      </div>
      <div className="nl-section-title" style={{ marginTop: 28 }}>
        <h2>2. Choose what to fund</h2>
        {suggestionsEnabled && (
          <button
            className="nl-secondary"
            disabled={!canEdit || saving || cap === null || cap <= 0}
            onClick={() => {
              setDraft(
                suggestAllocation(
                  data.categories,
                  data.funding.categories,
                  Math.min(cap || 0, Math.max(0, data.summary.current_savings)),
                  isFeatureEnabled("priority_system"),
                ),
              );
              setReceipt(null);
            }}
          >
            Suggest remaining funding
          </button>
        )}
      </div>
      <p className="nl-footnote">
        Remaining to fund uses your current monthly plan minus allocations
        already recorded this month. Target-balance envelopes use the gap to
        their target. Goal envelopes stay manual; review goal progress before
        funding them.{" "}
        {suggestionsEnabled
          ? `Suggestions follow ${isFeatureEnabled("priority_system") ? "priority, then envelope order" : "envelope order"} and stop at the amount you set. Every amount is editable.`
          : "Enter the amounts you want to fund below."}
      </p>
      <div className="nl-table-wrap">
        <table className="nl-table">
          <thead>
            <tr>
              <th>Envelope</th>
              <th className="nl-right">Monthly plan</th>
              <th className="nl-right">Already funded</th>
              <th className="nl-right">Remaining to fund</th>
              <th className="nl-right">Fund now</th>
            </tr>
          </thead>
          <tbody>
            {envelopes.map((c) => {
              const funded =
                data.funding.categories.find((f) => f.categoryId === c.id)
                  ?.fundedAmount || 0;
              return (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <span className="nl-subtext">
                      Balance: {money(c.current_balance)}
                    </span>
                  </td>
                  <td data-label="Monthly plan" className="nl-right nl-number">
                    {money(c.monthly_amount)}
                  </td>
                  <td
                    data-label="Already funded"
                    className="nl-right nl-number"
                  >
                    {money(funded)}
                  </td>
                  <td
                    data-label="Remaining to fund"
                    className="nl-right nl-number"
                  >
                    {money(remainingFunding(c, funded))}
                  </td>
                  <td data-label="Fund now" className="nl-right">
                    <input
                      className="nl-money-input"
                      aria-label={`Fund ${c.name}`}
                      inputMode="decimal"
                      value={draft[c.id] ?? "0.00"}
                      disabled={!canEdit || saving}
                      onChange={(e) => {
                        setDraft({ ...draft, [c.id]: e.target.value });
                        setReceipt(null);
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!envelopes.length && (
        <p className="nl-notice">
          Create envelopes in classic before allocating.{" "}
          <Link href="/categories">Manage envelopes →</Link>
        </p>
      )}
      <div className="nl-savebar">
        <div>
          <strong>{money(total)} ready to allocate</strong>
          <p>
            {invalid
              ? "Enter valid, nonnegative amounts with up to two decimals."
              : cap !== null && total > cap
                ? "This is more than the amount you chose to work with."
                : total > data.summary.current_savings
                  ? "This is more than your available-to-save money."
                  : cap !== null
                    ? `${money(Math.max(0, cap - total))} of this amount left to assign`
                    : "Set an amount above, then choose what to fund."}
          </p>
        </div>
        <div>
          <button
            className="nl-secondary"
            disabled={saving}
            onClick={() => setDraft({})}
          >
            Clear amounts
          </button>
          <button
            className="nl-primary"
            disabled={!valid || !canEdit || saving || refreshing}
            onClick={() => setPreview(true)}
          >
            Review allocation →
          </button>
        </div>
      </div>
      <p className="nl-footnote">
        Need to fund from your income buffer or use other allocation tools?{" "}
        <Link href="/money-movement">Open money movement in classic ↗</Link>
      </p>
      <Dialog
        open={preview}
        onOpenChange={(open) => {
          if (!saving) setPreview(open);
        }}
      >
        <DialogContent className="new-look">
          <DialogHeader>
            <DialogTitle>Review this allocation</DialogTitle>
            <DialogDescription>
              This increases the selected envelope balances and their funding
              for{" "}
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
              .
            </DialogDescription>
          </DialogHeader>
          <div className="nl-dialog-summary max-h-72 overflow-auto">
            {allocations
              .filter((a) => a.amount && a.amount > 0)
              .map((a) => (
                <div key={a.categoryId}>
                  <span>
                    {envelopes.find((c) => c.id === a.categoryId)?.name}
                  </span>
                  <strong>{money(a.amount!)}</strong>
                </div>
              ))}
            <hr />
            <div>
              <strong>Total</strong>
              <strong>{money(total)}</strong>
            </div>
            <div>
              <span>Available to save after</span>
              <strong>{money(data.summary.current_savings - total)}</strong>
            </div>
          </div>
          <div className="nl-form-actions">
            <button
              className="nl-secondary"
              disabled={saving}
              onClick={() => setPreview(false)}
            >
              Keep editing
            </button>
            <button
              className="nl-primary"
              disabled={saving || !valid || !canEdit}
              onClick={apply}
            >
              {saving ? "Allocating…" : `Allocate ${money(total)}`}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
