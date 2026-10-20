"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Pencil,
  Mail,
  ReceiptText,
  Target,
  Sprout,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { useFeatures } from "@/contexts/FeatureContext";
import type { Category } from "@/lib/types";
import { cents, localDate, money, ordinaryEnvelopes } from "@/lib/new-look";
import { envelopeOverview } from "@/lib/envelope-overview";
import {
  envelopeDetailHref,
  type EnvelopeTab,
} from "@/lib/envelope-navigation";
import {
  envelopeActivityGroups,
  type EnvelopeActivityGroup,
} from "@/lib/envelope-activity";
import type { EnvelopeInsights } from "@/lib/envelope-insights";
import { DataBoundary, budgetRequest, useBudget } from "./budget-context";
import { ReadOnlyNotice } from "./common";
import { EnvelopeMoney, EnvelopeEditor } from "./envelopes";
import { EnvelopeSetupEditor } from "./envelope-setup";
import { EnvelopeActivity } from "./envelope-activity";

export function GuidedEnvelopeDetail({ categoryId }: { categoryId: number }) {
  return (
    <DataBoundary>
      <EnvelopeDetailContent categoryId={categoryId} />
    </DataBoundary>
  );
}
function EnvelopeDetailContent({ categoryId }: { categoryId: number }) {
  const { data } = useBudget();
  const params = useSearchParams();
  if (!data) return null;
  const category = data.categories.find(
    (c) => c.id === categoryId && !c.is_system && !c.is_buffer,
  );
  if (!category)
    return (
      <div className="nl-panel">
        <h1>Envelope unavailable</h1>
        <p>
          This envelope may be archived, removed, or part of another budget.
        </p>
        <Link className="nl-secondary" href="/new/budget">
          Back to envelopes
        </Link>
      </div>
    );
  return (
    <EnvelopeDetailBody
      key={`${data.identity.activeAccountId}:${categoryId}`}
      category={category}
      search={params.toString()}
    />
  );
}

function EnvelopeDetailBody({
  category,
  search,
}: {
  category: Category;
  search: string;
}) {
  const { data, canEdit, refresh } = useBudget();
  const features = useFeatures();
  const router = useRouter();
  const params = new URLSearchParams(search);
  const month = localDate().slice(0, 7);
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );
  const [insights, setInsights] = useState<EnvelopeInsights | null>(null);
  const [insightsError, setInsightsError] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const activityHeading = useRef<HTMLHeadingElement>(null);
  const funded =
    data?.funding.categories.find((f) => f.categoryId === category.id)
      ?.fundedAmount ?? 0;
  useEffect(() => {
    const controller = new AbortController();
    setInsightsLoading(true);
    setInsightsError(false);
    fetch(`/api/categories/${category.id}/insights?month=${month}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load spending");
        const result = await response.json();
        if (!Array.isArray(result.months))
          throw new Error("Invalid spending response");
        if (!controller.signal.aborted) setInsights(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setInsightsError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setInsightsLoading(false);
      });
    return () => controller.abort();
  }, [
    category.id,
    category.updated_at,
    category.current_balance,
    month,
    funded,
    attempt,
  ]);
  if (!data) return null;
  const overview = envelopeOverview(category, funded);
  const current = insights?.months.find((m) => m.month === month);
  const rawGroup = params.get("activity") || "all";
  const group: EnvelopeActivityGroup = Object.hasOwn(
    envelopeActivityGroups,
    rawGroup,
  )
    ? (rawGroup as EnvelopeActivityGroup)
    : "all";
  const action = params.get("action");
  const editorMode: EnvelopeTab | null =
    action === "transfer" || action === "adjust" || action === "activity"
      ? action
      : null;
  const detailHref = envelopeDetailHref(category.id, search);
  const checkin = new URL(detailHref, "https://local.invalid").searchParams.get(
    "checkin",
  );
  const backHref = `/new/budget${checkin ? `?checkin=${checkin}` : ""}`;
  const editable =
    canEdit && !features.loading && !features.error && !category.is_archived;
  function changeParam(key: string, value: string | null) {
    const next = new URLSearchParams(search);
    if (value === null) next.delete(key);
    else next.set(key, value);
    router.replace(`/new/budget/${category.id}${next.size ? `?${next}` : ""}`, {
      scroll: false,
    });
  }
  function showFunding() {
    changeParam("activity", "funding");
    activityHeading.current?.scrollIntoView({
      block: "start",
      behavior: "auto",
    });
    activityHeading.current?.focus({ preventScroll: true });
  }
  const TypeIcon =
    overview.kind === "goal"
      ? Sprout
      : overview.kind === "reserve"
        ? Target
        : overview.kind === "yearly"
          ? CalendarDays
          : Mail;
  const purposeText =
    overview.kind === "goal"
      ? "This envelope holds money for a goal. The goal tracks progress; this balance tells you what is still set aside."
      : overview.kind === "yearly"
        ? "Build up money over time for costs that don’t happen every month. The balance stays here until you use it."
        : overview.kind === "reserve"
          ? "Keep a cushion ready for when you need it. Your balance target describes how much you want to keep here."
          : "Keep money ready for regular spending. Your monthly budget guides funding; the balance tells you what’s left.";
  const transactionsHref = `/new/transactions?categoryId=${category.id}`;
  return (
    <div className="nl-envelope-detail">
      <div className="nl-detail-topline">
        <Link className="nl-detail-back" href={backHref}>
          <ArrowLeft size={16} />
          {checkin ? "Back to envelope check-in" : "All envelopes"}
        </Link>
        {!category.is_goal && (
          <button
            className="nl-secondary"
            disabled={!editable}
            onClick={() => changeParam("action", "plan")}
          >
            <Pencil size={14} /> Edit envelope
          </button>
        )}
      </div>
      <header className="nl-detail-heading">
        <span className="nl-detail-emblem">
          <TypeIcon size={26} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <div>
          <p className="nl-eyebrow">{overview.typeLabel}</p>
          <h1>{category.name}</h1>
        </div>
      </header>
      <ReadOnlyNotice />
      <section
        className="nl-detail-hero"
        aria-label="Envelope balance and funding"
      >
        <div className="nl-detail-balance">
          <EnvelopeMoney name={category.name} overview={overview} />
          <p>
            Money currently in this envelope, including carryover and transfers.
          </p>
          <div className="nl-detail-actions">
            <button
              className="nl-primary"
              disabled={!canEdit || !!category.is_archived}
              onClick={() => changeParam("action", "transfer")}
            >
              <ArrowLeftRight size={16} />
              {overview.negative ? "Cover shortfall" : "Move money"}
            </button>
            <button
              className="nl-secondary"
              disabled={!canEdit || !!category.is_archived}
              onClick={() => changeParam("action", "adjust")}
            >
              Set balance
            </button>
          </div>
        </div>
        <div className="nl-detail-funding">
          <div className="nl-detail-section-heading">
            <h2>{monthLabel}</h2>
            <CalendarDays size={17} aria-hidden="true" />
          </div>
          <dl>
            <div>
              <dt>Funded this month</dt>
              <dd>{money(funded)}</dd>
            </div>
            <div>
              <dt>Monthly budget</dt>
              <dd>{money(category.monthly_amount)}</dd>
            </div>
          </dl>
          <p>
            Funding counts money allocated this month. Transfers and balance
            adjustments are separate.
          </p>
          <button className="nl-activity-link" onClick={showFunding}>
            See funding history <ArrowDownLeft size={14} />
          </button>
          <div className="nl-detail-fund-footer">
            <span>
              <small>Available to save</small>
              <strong>{money(data.summary.current_savings)}</strong>
            </span>
            <Link href="/new/payday">
              Allocate money <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
      <div className="nl-detail-body">
        <section
          className="nl-detail-history"
          aria-labelledby="envelope-history-heading"
        >
          <div className="nl-detail-section-heading">
            <div>
              <p className="nl-eyebrow">Follow the money</p>
              <h2
                id="envelope-history-heading"
                ref={activityHeading}
                tabIndex={-1}
              >
                What changed?
              </h2>
            </div>
            <Link className="nl-activity-link" href={transactionsHref}>
              All transactions <ArrowUpRight size={14} />
            </Link>
          </div>
          <p className="nl-detail-intro">
            Every recorded change, with the balance it left behind.
          </p>
          <div
            className="nl-filters nl-detail-history-filters"
            aria-label="Filter envelope activity"
          >
            {Object.entries(envelopeActivityGroups).map(([value, label]) => (
              <button
                key={value}
                className={group === value ? "active" : ""}
                aria-pressed={group === value}
                onClick={() =>
                  changeParam("activity", value === "all" ? null : value)
                }
              >
                {label}
              </button>
            ))}
          </div>
          <EnvelopeActivity
            categoryId={category.id}
            currentBalance={category.current_balance}
            funded={funded}
            spent={data.spending[category.id] || 0}
            variant="page"
            group={group}
          />
        </section>
        <aside
          className="nl-detail-context"
          aria-label="Spending and envelope plan"
        >
          <section className="nl-detail-spending">
            <div className="nl-detail-section-heading">
              <h2>Spending at a glance</h2>
              <ReceiptText size={17} aria-hidden="true" />
            </div>
            <p className="nl-detail-month-label">{monthLabel} · so far</p>
            {insightsError ? (
              <div className="nl-detail-load-state" role="alert">
                <p>
                  Spending could not be loaded. Your balance and activity are
                  still available.
                </p>
                <button
                  className="nl-secondary"
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  Try again
                </button>
              </div>
            ) : insightsLoading || !current ? (
              <p className="nl-detail-load-state" role="status">
                Loading recorded spending…
              </p>
            ) : (
              <>
                <div className="nl-detail-spent">
                  <strong>{money(current.expenses)}</strong>
                  <span>recorded expenses</span>
                </div>
                <dl className="nl-detail-income">
                  <div>
                    <dt>Refunds & other income</dt>
                    <dd>{money(current.incoming)}</dd>
                  </div>
                  <div>
                    <dt>Transactions</dt>
                    <dd>{current.transactionCount}</dd>
                  </div>
                </dl>
                <SpendingHistory
                  insights={insights!}
                  categoryId={category.id}
                />
                <p className="nl-detail-chart-help">
                  Bars show recorded expenses. Refunds and other income are
                  separate. Select a month to see its transactions.
                </p>
                <Link className="nl-activity-link" href="/new/imports">
                  Keep this up to date with an import <ArrowRight size={14} />
                </Link>
              </>
            )}
          </section>
          <section className="nl-detail-purpose">
            <div className="nl-detail-section-heading">
              <h2>The plan for this money</h2>
              <TypeIcon size={17} aria-hidden="true" />
            </div>
            <p>{purposeText}</p>
            {(overview.kind === "yearly" || overview.kind === "reserve") &&
              overview.reference > 0 && (
                <dl>
                  <div>
                    <dt>{overview.referenceLabel}</dt>
                    <dd>{money(overview.reference)}</dd>
                  </div>
                </dl>
              )}
            {overview.surplus > 0 && (
              <div className="nl-detail-guidance">
                <strong>
                  {money(overview.surplus)} above the monthly budget
                </strong>
                <p>
                  You can keep this for later or move some to another envelope.
                </p>
              </div>
            )}
            {category.notes && (
              <div className="nl-detail-notes">
                <h3>Your notes</h3>
                <p>{category.notes}</p>
              </div>
            )}
            {category.is_goal ? (
              <Link className="nl-activity-link" href="/new/goals">
                Review your goals <ArrowRight size={14} />
              </Link>
            ) : (
              <button
                className="nl-activity-link"
                disabled={!editable}
                onClick={() => changeParam("action", "plan")}
              >
                {category.notes
                  ? "Edit plan & notes"
                  : "Edit plan or add a note"}{" "}
                <Pencil size={13} />
              </button>
            )}
          </section>
        </aside>
      </div>
      {editorMode && (
        <EnvelopeEditor
          category={category}
          mode={editorMode}
          onTabChange={(value) => changeParam("action", value)}
          onClose={() => changeParam("action", null)}
        />
      )}
      {action === "plan" && !category.is_goal && (
        <EnvelopeSetupEditor
          category={category}
          advanced={
            features.hasPremium && features.isFeatureEnabled("category_types")
          }
          priorityEnabled={
            features.hasPremium && features.isFeatureEnabled("priority_system")
          }
          canEdit={editable}
          monthlyTotal={
            ordinaryEnvelopes(data.categories).reduce(
              (sum, c) => sum + cents(c.monthly_amount),
              0,
            ) / 100
          }
          netIncome={data.summary.monthly_net_income}
          onClose={() => changeParam("action", null)}
          onSave={async (payload) => {
            if (!editable)
              throw new Error(
                "You don’t have permission to change this envelope.",
              );
            await budgetRequest(
              `/api/categories/${category.id}`,
              payload,
              "PATCH",
            );
            toast.success("Envelope plan saved. No money was moved.");
            await refresh().catch(() =>
              toast.error(
                "Saved, but the budget could not refresh. Reload before making more changes.",
              ),
            );
          }}
        />
      )}
    </div>
  );
}
function SpendingHistory({
  insights,
  categoryId,
}: {
  insights: EnvelopeInsights;
  categoryId: number;
}) {
  const max = Math.max(1, ...insights.months.map((m) => m.expenses));
  return (
    <div className="nl-detail-spending-history">
      <h3>Last six months</h3>
      <div
        className="nl-detail-chart"
        role="list"
        aria-label="Monthly recorded expenses"
      >
        {insights.months.map((month, index) => {
          const date = new Date(`${month.month}-01T12:00:00`);
          const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          const href = `/new/transactions?categoryId=${categoryId}&startDate=${month.month}-01&endDate=${localDate(end)}`;
          const label = date.toLocaleDateString("en-US", { month: "short" });
          return (
            <div role="listitem" key={month.month}>
              <Link
                href={href}
                data-current={index === insights.months.length - 1}
                aria-label={`${date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}: ${money(month.expenses)} recorded expenses. View transactions.`}
              >
                <span className="nl-detail-bar-value">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(month.expenses)}
                </span>
                <span className="nl-detail-bar-track">
                  <span
                    style={{
                      height: `${Math.max(0, (month.expenses / max) * 100)}%`,
                    }}
                  />
                </span>
                <span className="nl-detail-bar-month">{label}</span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
