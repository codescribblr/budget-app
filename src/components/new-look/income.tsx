"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  CreateIncomeStreamRequest,
  IncomeStream,
  NonCashAsset,
} from "@/lib/types";
import { calculateStreamMonthlyNet } from "@/lib/income-calculations";
import { incomeSummary, payFrequencies } from "@/lib/income-planning";
import { money, ordinaryEnvelopes } from "@/lib/new-look";
import { budgetRequest, DataBoundary, useBudget } from "./budget-context";
import { PageHeading, ReadOnlyNotice } from "./common";
import { IncomeEditor } from "./income-editor";

export function GuidedIncome() {
  const { data } = useBudget();
  return (
    <DataBoundary>
      {data && <IncomeContent key={data.identity.activeAccountId} />}
    </DataBoundary>
  );
}

function IncomeContent() {
  const { data, canEdit, refresh } = useBudget();
  const params = useSearchParams();
  const planHref =
    params.get("checkin") === "monthly"
      ? "/new/plan?checkin=monthly"
      : "/new/plan";
  const [streams, setStreams] = useState<IncomeStream[]>([]);
  const [assets, setAssets] = useState<NonCashAsset[]>([]);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState<IncomeStream | "new" | null>(null);
  const [removing, setRemoving] = useState<IncomeStream | null>(null);
  const [removingBusy, setRemovingBusy] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void Promise.allSettled([
      budgetRequest<IncomeStream[]>("/api/income-streams"),
      budgetRequest<NonCashAsset[]>("/api/non-cash-assets"),
    ]).then(([income, assetList]) => {
      if (!active) return;
      if (income.status === "fulfilled" && Array.isArray(income.value))
        setStreams(income.value);
      else
        setError(
          income.status === "rejected" && income.reason instanceof Error
            ? income.reason.message
            : "Unexpected income response. Please try again.",
        );
      if (assetList.status === "fulfilled" && Array.isArray(assetList.value)) {
        setAssets(assetList.value);
        setAssetsError(null);
      } else setAssetsError("Could not load linked assets.");
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [attempt]);
  const totals = incomeSummary(streams);
  const target = ordinaryEnvelopes(data?.categories || []).reduce(
    (sum, c) =>
      sum +
      (c.category_type === "accumulation"
        ? (c.annual_target ?? c.monthly_amount * 12) / 12
        : c.monthly_amount),
    0,
  );
  const remaining = totals.net - target;
  const included = streams.filter((s) => s.include_in_budget);
  const excluded = streams.filter((s) => !s.include_in_budget);
  async function refreshPlan() {
    try {
      await refresh();
    } catch {
      toast.error(
        "Income saved, but the budget summary could not refresh. Reload before editing again.",
      );
    }
  }
  async function save(source: CreateIncomeStreamRequest) {
    if (!canEdit)
      throw new Error(
        "Editing is unavailable. Refresh the page and check your access.",
      );
    const existing = editing && editing !== "new" ? editing : null;
    const updated = await budgetRequest<IncomeStream>(
      existing ? `/api/income-streams/${existing.id}` : "/api/income-streams",
      source,
      existing ? "PATCH" : "POST",
    );
    setStreams((previous) =>
      (existing
        ? previous.map((s) => (s.id === existing.id ? updated : s))
        : [...previous, updated]
      ).sort((a, b) => a.sort_order - b.sort_order),
    );
    toast.success(existing ? "Income source updated." : "Income source added.");
    await refreshPlan();
  }
  async function remove() {
    if (!removing || removingBusy || !canEdit) return;
    setRemovingBusy(true);
    setRemoveError(null);
    try {
      // Retain the last record: the shared API otherwise re-creates legacy income on the next read.
      if (streams.length === 1) {
        const updated = await budgetRequest<IncomeStream>(
          `/api/income-streams/${removing.id}`,
          { include_in_budget: false },
          "PATCH",
        );
        setStreams([updated]);
        toast.success("Income source excluded from your monthly plan.");
      } else {
        await budgetRequest(`/api/income-streams/${removing.id}`, {}, "DELETE");
        setStreams((previous) => previous.filter((s) => s.id !== removing.id));
        toast.success("Income source removed.");
      }
      setRemoving(null);
      await refreshPlan();
    } catch (err) {
      setRemoveError(
        err instanceof Error
          ? err.message
          : "Could not remove this source. Please try again.",
      );
    } finally {
      setRemovingBusy(false);
    }
  }
  function sourceRow(stream: IncomeStream) {
    const net = calculateStreamMonthlyNet(stream);
    return (
      <article key={stream.id} className="nl-income-source">
        <div className="nl-income-source-name">
          <h3>{stream.name}</h3>
          <p>
            {
              payFrequencies.find((f) => f.value === stream.pay_frequency)
                ?.label
            }{" "}
            · {money(stream.annual_income)} gross / year
          </p>
          {stream.pay_frequency === "bi-weekly" && (
            <small>
              {stream.include_extra_paychecks
                ? "All 26 paychecks averaged"
                : "Uses 2 paychecks per month"}
            </small>
          )}
          {!!stream.pre_tax_deduction_items?.length && (
            <small>
              {stream.pre_tax_deduction_items.length} pre-tax{" "}
              {stream.pre_tax_deduction_items.length === 1
                ? "deduction"
                : "deductions"}
            </small>
          )}
          {!!stream.linked_non_cash_asset_id && (
            <small>
              Linked asset:{" "}
              {assets.find((a) => a.id === stream.linked_non_cash_asset_id)
                ?.name || "Retirement forecast asset"}
            </small>
          )}
        </div>
        <div className="nl-income-source-total">
          <strong className={net < 0 ? "nl-negative" : undefined}>
            {money(net)}
          </strong>
          <span>
            net / month{!stream.include_in_budget ? " · excluded" : ""}
          </span>
        </div>
        <div className="nl-income-source-actions">
          <button
            className="nl-secondary"
            disabled={!canEdit}
            aria-label={`Edit ${stream.name}`}
            onClick={() => setEditing(stream)}
          >
            Edit
          </button>
          {(streams.length > 1 || stream.include_in_budget) && (
            <button
              className="nl-income-remove"
              disabled={!canEdit}
              aria-label={`${streams.length === 1 ? "Exclude" : "Remove"} ${stream.name}`}
              onClick={() => {
                setRemoving(stream);
                setRemoveError(null);
              }}
            >
              {streams.length === 1 ? "Exclude" : "Remove"}
            </button>
          )}
        </div>
      </article>
    );
  }
  return (
    <>
      <Link className="nl-income-back" href={planHref}>
        ← Back to monthly plan
      </Link>
      <PageHeading
        eyebrow="Income planning"
        title="Know what you can plan with"
        description="Bring your income sources together into a monthly estimate. Use it to set funding targets you can sustain."
      >
        <button
          className="nl-primary"
          disabled={!canEdit || loading || !!error}
          onClick={() => setEditing("new")}
        >
          <Plus size={17} /> Add income source
        </button>
      </PageHeading>
      <ReadOnlyNotice />
      {loading ? (
        <div className="nl-panel" role="status">
          Loading your income…
        </div>
      ) : error ? (
        <div className="nl-panel" role="alert">
          <h2>Income couldn’t be loaded</h2>
          <p>{error}</p>
          <button
            className="nl-primary"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <section className="nl-income-overview">
            <div>
              <p className="nl-eyebrow">Estimated monthly net income</p>
              <strong className="nl-income-hero-number">
                {money(totals.net)}
              </strong>
              <p>
                From {included.length} included{" "}
                {included.length === 1 ? "source" : "sources"} · after estimated
                taxes and pre-tax deductions
              </p>
            </div>
            <div className="nl-income-plan-fit">
              <p className="nl-eyebrow">How your plan fits</p>
              <strong className={remaining < 0 ? "nl-negative" : ""}>
                {money(Math.abs(remaining))}{" "}
                {remaining < 0 ? "over income" : "left to plan"}
              </strong>
              <p>Your envelopes target {money(target)} per month.</p>
              <Link href={planHref}>
                Review monthly targets <ArrowRight size={15} />
              </Link>
            </div>
          </section>
          <div className="nl-two-column nl-income-layout">
            <div>
              <div className="nl-section-title">
                <h2>Income you’re planning with</h2>
                <span className="nl-tag">{included.length} included</span>
              </div>
              {included.length ? (
                <div className="nl-income-sources">
                  {included.map(sourceRow)}
                </div>
              ) : (
                <section className="nl-panel nl-income-empty">
                  <Wallet size={25} aria-hidden="true" />
                  <h3>
                    {streams.length
                      ? "No sources included"
                      : "Start with your first income source"}
                  </h3>
                  <p>
                    {streams.length
                      ? "Edit an excluded source to include it, or add a new one."
                      : "Add a job, freelance work, rental income, or another source you expect to receive."}
                  </p>
                  <button
                    className="nl-primary"
                    disabled={!canEdit}
                    onClick={() => setEditing("new")}
                  >
                    Add income source
                  </button>
                </section>
              )}
              {!!excluded.length && (
                <section className="nl-income-excluded">
                  <div className="nl-section-title">
                    <h2>Kept out of your plan</h2>
                    <span className="nl-tag">{excluded.length} excluded</span>
                  </div>
                  <p>
                    These sources are saved, but don’t count toward the monthly
                    total.
                  </p>
                  <div className="nl-income-sources">
                    {excluded.map(sourceRow)}
                  </div>
                </section>
              )}
              <p className="nl-footnote">
                Income varies? Use an amount you can reasonably rely on.
                Quarterly and annual pay are spread across the year for
                planning; they won’t arrive every month.
              </p>
            </div>
            <aside className="nl-aside-stack">
              <section className="nl-panel">
                <h2>Your monthly estimate</h2>
                <dl className="nl-metrics nl-income-breakdown">
                  <div>
                    <dt>Gross income</dt>
                    <dd>{money(totals.gross)}</dd>
                  </div>
                  <div>
                    <dt>Pre-tax deductions</dt>
                    <dd>−{money(totals.deductions)}</dd>
                  </div>
                  <div>
                    <dt>Estimated taxes</dt>
                    <dd>−{money(totals.taxes)}</dd>
                  </div>
                  <div className="nl-income-net">
                    <dt>Net income</dt>
                    <dd>{money(totals.net)}</dd>
                  </div>
                </dl>
                <p className="nl-footnote">
                  Uses the included sources and their planning settings. This is
                  an estimate, not a deposit balance.
                </p>
              </section>
              <section className="nl-panel">
                <p className="nl-eyebrow">When money arrives</p>
                <h2>Give the actual paycheck a job</h2>
                <p>
                  Updating income changes your plan. When you get paid, check
                  your account balance and allocate the money that arrived.
                </p>
                <Link href="/new/payday">
                  Allocate a paycheck <ArrowRight size={15} />
                </Link>
              </section>
            </aside>
          </div>
        </>
      )}
      {editing && (
        <IncomeEditor
          stream={editing === "new" ? null : editing}
          assets={assets}
          assetsError={assetsError}
          canEdit={canEdit}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
      {removing && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !removingBusy) setRemoving(null);
          }}
        >
          <DialogContent className="new-look sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {streams.length === 1 ? "Exclude" : "Remove"} {removing.name}?
              </DialogTitle>
              <DialogDescription>
                {streams.length === 1
                  ? "This source will stay saved but won’t count toward your monthly plan. You can include it again by editing it."
                  : "This removes the income planning source. Existing transactions, account balances, and envelope balances stay the same."}
              </DialogDescription>
            </DialogHeader>
            {removeError && (
              <p className="nl-error" role="alert">
                {removeError}
              </p>
            )}
            <div className="nl-form-actions">
              <button
                className="nl-secondary"
                disabled={removingBusy}
                onClick={() => setRemoving(null)}
              >
                Cancel
              </button>
              <button
                className="nl-primary"
                disabled={!canEdit || removingBusy}
                onClick={() => void remove()}
              >
                {removingBusy
                  ? "Saving…"
                  : streams.length === 1
                    ? "Exclude source"
                    : "Remove source"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
