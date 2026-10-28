"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  SlidersHorizontal,
  Mail,
  Store,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { parseLocalDate } from "@/lib/date-utils";
import { localDate, money, cents } from "@/lib/new-look";
import { reviewDatePreset } from "@/lib/transaction-review";
import {
  completedReportMonths,
  type BudgetReview,
  type ReportEnvelope,
  type ReviewPeriod,
} from "@/lib/budget-review";
import { DataBoundary, useBudget } from "./budget-context";
import { PageHeading, TaskReturn, CheckinFooter } from "./common";
import { useTaskCheckin } from "./checkin-flow";
import { NativeSelect } from "./native-select";
const day = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const monthName = (value: string) =>
  new Date(`${value}-01T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
const rangeLabel = (p: ReviewPeriod) =>
  p.start && p.end
    ? `${day(p.start)} – ${day(p.end)}`
    : p.start
      ? `From ${day(p.start)}`
      : p.end
        ? `Through ${day(p.end)}`
        : "All recorded dates";
function reportPreset(value: string) {
  const dates = reviewDatePreset(value);
  if (value === "current-month" || value === "current-year")
    dates.end = localDate();
  return dates;
}
export function GuidedBudgetReports() {
  return (
    <DataBoundary>
      <BudgetReportsContent />
    </DataBoundary>
  );
}
function BudgetReportsContent() {
  const { data } = useBudget();
  const params = useSearchParams();
  const checkin = useTaskCheckin("reports");
  const defaultPreset =
    checkin === "weekly"
      ? "week"
      : checkin === "monthly"
        ? "last-month"
        : "current-month";
  const preset =
    params.get("dateRange") ||
    (params.has("startDate") || params.has("endDate")
      ? "custom"
      : defaultPreset);
  const defaults = reportPreset(preset);
  const explicit =
    params.has("startDate") ||
    params.has("endDate") ||
    params.get("dateRange") === "custom" ||
    params.get("dateRange") === "all";
  const start = explicit ? params.get("startDate") : defaults.start,
    end = explicit ? params.get("endDate") : defaults.end;
  const categoryId = params.get("categoryId") || "";
  const includeSystem = params.get("includeSystem") === "true";
  const view = params.get("view") === "plan" ? "plan" : "spending";
  const [report, setReport] = useState<BudgetReview | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [breakdown, setBreakdown] = useState("envelopes");
  function change(values: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    window.history.pushState(
      null,
      "",
      `/new/reports${next.size ? `?${next}` : ""}`,
    );
  }
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setReport(null);
    const query = new URLSearchParams({ asOf: localDate() });
    if (view === "plan") {
      const months = completedReportMonths(localDate());
      query.set("startDate", `${months[0]}-01`);
      query.set(
        "endDate",
        new Date(
          Date.UTC(
            Number(months[2].slice(0, 4)),
            Number(months[2].slice(5, 7)),
            0,
          ),
        )
          .toISOString()
          .slice(0, 10),
      );
    } else {
      if (start) query.set("startDate", start);
      if (end) query.set("endDate", end);
      if (categoryId) query.set("categoryId", categoryId);
      if (includeSystem) query.set("includeSystem", "true");
    }
    fetch(`/api/reports/budget-review?${query}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error || "Reports could not load.");
        if (
          !body.totals ||
          !Array.isArray(body.categories) ||
          !Array.isArray(body.months)
        )
          throw new Error("Report data could not be read.");
        if (!controller.signal.aborted) setReport(body);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err.message || "Reports could not load.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    start,
    end,
    categoryId,
    includeSystem,
    view,
    attempt,
    data?.identity.activeAccountId,
  ]);
  const options = (data?.categories || []).filter(
    (c) => includeSystem || (!c.is_system && !c.is_buffer),
  );
  const selected = data?.categories.find((c) => String(c.id) === categoryId);
  const ready = !!report && !loading && !error;
  const txLink = (
    category?: number | null,
    type?: string,
    merchant?: number | null,
  ) => {
    const q = new URLSearchParams();
    if (start) q.set("startDate", start);
    if (end) q.set("endDate", end);
    if (category || categoryId)
      q.set("categoryId", String(category || categoryId));
    if (type) q.set("transactionType", type);
    if (merchant) q.set("merchantGroupId", String(merchant));
    return `/new/transactions${q.size ? `?${q}` : ""}`;
  };
  const difference = report
    ? (cents(report.totals.expenses) - cents(report.totals.previousExpenses)) /
      100
    : 0;
  const changes =
    report?.categories
      .filter((c) => c.expenses !== c.previousExpenses)
      .sort(
        (a, b) =>
          Math.abs(b.expenses - b.previousExpenses) -
          Math.abs(a.expenses - a.previousExpenses),
      )
      .slice(0, 3) || [];
  return (
    <div className="nl-budget-reports">
      <TaskReturn task="reports" cadence="weekly" />
      <PageHeading
        eyebrow={
          checkin
            ? `${checkin === "monthly" ? "Monthly" : "Weekly"} · reflect & adjust`
            : "Reports · understand your budget"
        }
        title="See what deserves your attention"
        description="Follow the money, notice what changed, and make a plan that fits real life."
      >
        <Link
          className="nl-secondary"
          href={
            checkin === "monthly" ? "/new/plan?checkin=monthly" : "/new/plan"
          }
        >
          <SlidersHorizontal size={16} />
          Review monthly plan
        </Link>
      </PageHeading>
      <nav className="nl-account-nav" aria-label="Report views">
        <button
          aria-current={view === "spending" ? "page" : undefined}
          onClick={() => change({ view: null })}
        >
          Spending review
        </button>
        <button
          aria-current={view === "plan" ? "page" : undefined}
          onClick={() => change({ view: "plan" })}
        >
          Monthly plan check
        </button>
        <Link href="/new/reports/net-worth">Net worth</Link>
      </nav>
      {view === "spending" && (
        <div className="nl-report-controls">
          <DateRangeFilter
            start={parseLocalDate(start || "") || undefined}
            end={parseLocalDate(end || "") || undefined}
            preset={{
              value: preset,
              onChange: (value) => {
                if (value === "custom") {
                  change({
                    dateRange: "custom",
                    startDate: start,
                    endDate: end,
                  });
                  return;
                }
                const range = reportPreset(value);
                change({
                  dateRange: value,
                  startDate: range.start,
                  endDate: range.end,
                });
              },
            }}
            onChange={(s, e) =>
              change({
                dateRange: "custom",
                startDate: s ? localDate(s) : null,
                endDate: e ? localDate(e) : null,
              })
            }
          />
          <NativeSelect
            aria-label="Report envelope"
            value={categoryId}
            onChange={(e) => change({ categoryId: e.target.value || null })}
          >
            <option value="">All envelopes</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.is_archived ? " (archived)" : ""}
              </option>
            ))}
          </NativeSelect>
          <label className="nl-report-system">
            <Switch
              checked={includeSystem}
              onCheckedChange={(value) =>
                change({
                  includeSystem: value ? "true" : null,
                  ...(!value && (selected?.is_system || selected?.is_buffer)
                    ? { categoryId: null }
                    : {}),
                })
              }
            />
            <span>Include system categories</span>
          </label>
        </div>
      )}
      {loading ? (
        <div className="nl-panel nl-report-loading" role="status">
          <ChartNoAxesCombined size={24} />
          Preparing your budget review…
        </div>
      ) : error ? (
        <div className="nl-panel" role="alert">
          <h2>Your report could not load</h2>
          <p>{error}</p>
          <button
            className="nl-secondary"
            onClick={() => setAttempt((v) => v + 1)}
          >
            Retry report
          </button>
        </div>
      ) : (
        report && (
          <>
            {view === "spending" ? (
              <>
                <section className="nl-review-hero">
                  <div>
                    <p className="nl-eyebrow">
                      {selected ? `${selected.name} · ` : ""}Recorded spending
                    </p>
                    <strong className="nl-position-total">
                      {money(report.totals.expenses)}
                    </strong>
                    <p>{rangeLabel(report.period)}</p>
                    <Link href={txLink(undefined, "expense")}>
                      Review this period’s transactions <ArrowRight size={15} />
                    </Link>
                  </div>
                  <div className="nl-review-comparison">
                    {report.comparison && report.totals.previousCount > 0 ? (
                      <>
                        <span className="nl-report-direction">
                          {difference > 0 ? (
                            <ArrowUpRight size={23} />
                          ) : (
                            <ArrowDownRight size={23} />
                          )}
                          <strong>
                            {money(Math.abs(difference))}{" "}
                            {difference > 0
                              ? "more"
                              : difference < 0
                                ? "less"
                                : "change"}
                          </strong>
                        </span>
                        <p>
                          Compared with {money(report.totals.previousExpenses)}{" "}
                          recorded spending
                        </p>
                        <small>{rangeLabel(report.comparison)}</small>
                      </>
                    ) : (
                      <>
                        <h2>
                          {report.comparison
                            ? "A starting point for your next review"
                            : "Your recorded spending, in one place"}
                        </h2>
                        <p>
                          {report.comparison
                            ? "There are no comparable transactions in the previous period. Import that history before drawing a conclusion about a change."
                            : "Explore the envelopes and merchants below. Keep your imports current for a useful picture."}
                        </p>
                      </>
                    )}
                    <p className="nl-report-qualification">
                      Based on imported and manually entered transactions.
                      Missing imports can change this picture.
                    </p>
                  </div>
                </section>
                <div className="nl-review-context">
                  <span>
                    <strong>{report.totals.count}</strong> transactions in this
                    view
                  </span>
                  <Link href={txLink(undefined, "income")}>
                    <strong>{money(report.totals.incoming)}</strong> recorded
                    money in <small>Income and refunds, shown separately</small>
                  </Link>
                  <span>
                    Latest transaction{" "}
                    <strong>
                      {report.latestTransactionDate
                        ? day(report.latestTransactionDate)
                        : "None in this period"}
                    </strong>
                  </span>
                </div>
                {report.comparison &&
                  report.totals.previousCount > 0 &&
                  changes.length > 0 && (
                    <section className="nl-report-changes">
                      <div className="nl-section-title">
                        <h2>What changed?</h2>
                        <span className="nl-muted">
                          Largest differences from the comparison period
                        </span>
                      </div>
                      <div className="nl-change-grid">
                        {changes.map((c) => {
                          const delta =
                            (cents(c.expenses) - cents(c.previousExpenses)) /
                            100;
                          return (
                            <Link
                              key={c.id ?? "none"}
                              href={txLink(c.id, "expense")}
                              className="nl-change-item"
                            >
                              <span>{c.name}</span>
                              <strong>
                                {money(Math.abs(delta))}{" "}
                                {delta > 0 ? "more" : "less"}
                              </strong>
                              <small>
                                {money(c.previousExpenses)} →{" "}
                                {money(c.expenses)} <ArrowRight size={14} />
                              </small>
                            </Link>
                          );
                        })}
                      </div>
                    </section>
                  )}
                {report.totals.unassigned > 0 && (
                  <div className="nl-notice">
                    <strong>
                      {money(report.totals.unassigned)} of spending has no
                      envelope.
                    </strong>{" "}
                    Assign it before deciding which budgets need adjusting.{" "}
                    <Link href={txLink(undefined, "expense")}>
                      Review this period’s transactions →
                    </Link>
                  </div>
                )}
                <section className="nl-panel nl-report-breakdown">
                  <div className="nl-section-title">
                    <div>
                      <p className="nl-eyebrow">Follow the details</p>
                      <h2>Where did the money go?</h2>
                    </div>
                    <div
                      className="nl-segmented"
                      role="group"
                      aria-label="Spending breakdown"
                    >
                      <button
                        aria-pressed={breakdown === "envelopes"}
                        onClick={() => setBreakdown("envelopes")}
                      >
                        <Mail size={15} />
                        Envelopes
                      </button>
                      <button
                        aria-pressed={breakdown === "merchants"}
                        onClick={() => setBreakdown("merchants")}
                      >
                        <Store size={15} />
                        Merchants
                      </button>
                    </div>
                  </div>
                  {breakdown === "envelopes" ? (
                    <>
                      <div className="nl-report-table-head">
                        <span>Envelope</span>
                        <span>Spending in this period</span>
                        <span>Money left today</span>
                        <span />
                      </div>
                      {report.categories.map((c) => (
                        <EnvelopeReportRow
                          key={c.id ?? "none"}
                          envelope={c}
                          max={report.totals.expenses || 1}
                          href={txLink(c.id)}
                          comparison={!!report.comparison}
                        />
                      ))}
                      <p className="nl-footnote">
                        Spending is recorded money out; refunds and income are
                        separate. Money left is the envelope’s current balance,
                        including funding, carryover, transfers, and
                        adjustments.
                      </p>
                    </>
                  ) : (
                    <div className="nl-merchant-report">
                      {report.merchants.map((m, i) => (
                        <Link
                          key={`${m.groupId}:${m.name}`}
                          href={
                            m.groupId
                              ? txLink(undefined, "expense", m.groupId)
                              : `${txLink(undefined, "expense")}&q=${encodeURIComponent(m.name)}`
                          }
                        >
                          <span className="nl-merchant-number">{i + 1}</span>
                          <span>
                            <strong>{m.name}</strong>
                            <small>
                              {m.count}{" "}
                              {m.count === 1 ? "transaction" : "transactions"} ·{" "}
                              {(
                                (m.expenses / (report.totals.expenses || 1)) *
                                100
                              ).toFixed(1)}
                              % of spending
                            </small>
                          </span>
                          <div className="nl-meter">
                            <span
                              style={{
                                width: `${(m.expenses / (report.totals.expenses || 1)) * 100}%`,
                              }}
                            />
                          </div>
                          <strong>{money(m.expenses)}</strong>
                          <ArrowRight size={15} />
                        </Link>
                      ))}
                    </div>
                  )}
                  {!report.totals.count && (
                    <div className="nl-position-empty">
                      <h3>No recorded transactions for this view</h3>
                      <p>
                        Try different dates or import your bank and card
                        activity.
                      </p>
                      <Link className="nl-primary" href="/new/imports">
                        Import transactions
                      </Link>
                    </div>
                  )}
                </section>
                {!includeSystem && report.totals.excluded > 0 && (
                  <p className="nl-footnote">
                    {money(report.totals.excluded)} assigned to system
                    categories is excluded. Mixed transactions contribute only
                    their non-system portions.
                  </p>
                )}
              </>
            ) : (
              <PlanReview report={report} />
            )}
            <div className="nl-position-guidance">
              <div>
                <h2>
                  {view === "plan"
                    ? "A plan is a choice, not an automatic correction"
                    : "Turn an observation into a useful change"}
                </h2>
                <p>
                  {view === "plan"
                    ? "Use history as a starting point, allow for upcoming changes, and keep the whole plan within your income."
                    : "Review an envelope’s activity, adjust its monthly budget, or move existing money to cover a shortfall."}
                </p>
              </div>
              <Link
                className="nl-secondary"
                href={view === "plan" ? "/new/plan" : "/new/budget"}
              >
                {view === "plan" ? "Edit monthly plan" : "Review envelopes"}{" "}
                <ArrowRight size={15} />
              </Link>
            </div>
          </>
        )
      )}
      <p className="nl-footnote">
        Specialized tag reports and retirement projections remain in{" "}
        <Link href="/reports">classic reports ↗</Link>.
      </p>
      <CheckinFooter
        task="reports"
        cadence="weekly"
        title="Ready to act on what you noticed?"
        description="Take any observations into your envelope review or monthly plan. You don’t need to change anything to complete a review."
        disabled={!ready}
      />
    </div>
  );
}
function EnvelopeReportRow({
  envelope: c,
  max,
  href,
  comparison,
}: {
  envelope: ReportEnvelope;
  max: number;
  href: string;
  comparison: boolean;
}) {
  return (
    <article className="nl-envelope-report-row">
      <div>
        {c.id && !c.system && !c.archived ? (
          <Link href={`/new/budget/${c.id}`}>{c.name}</Link>
        ) : (
          <strong>{c.name}</strong>
        )}
        {c.archived && <small>Archived envelope</small>}
        {c.incoming > 0 && (
          <small>{money(c.incoming)} money in this period</small>
        )}
      </div>
      <div>
        <strong>{money(c.expenses)}</strong>
        <div className="nl-meter" aria-hidden="true">
          <span style={{ width: `${(c.expenses / max) * 100}%` }} />
        </div>
        <small>
          {max > 0 ? ((c.expenses / max) * 100).toFixed(1) : "0"}% of this
          view’s spending
        </small>
        {comparison && (
          <small>{money(c.previousExpenses)} in comparison period</small>
        )}
      </div>
      <div>
        <span className="nl-mobile-label">Money left today</span>
        <strong
          className={
            c.currentBalance !== null && c.currentBalance < 0
              ? "nl-negative"
              : ""
          }
        >
          {c.currentBalance === null ? "—" : money(c.currentBalance)}
        </strong>
      </div>
      <Link
        className="nl-report-row-action"
        href={href}
        aria-label={
          c.id === null
            ? "Review transactions for this period"
            : `Review ${c.name} transactions`
        }
      >
        <ArrowRight size={18} />
      </Link>
    </article>
  );
}
function PlanReview({ report }: { report: BudgetReview }) {
  if (!report.advanced)
    return (
      <section className="nl-panel nl-position-empty">
        <CalendarDays size={30} />
        <h2>A longer view for your monthly plan</h2>
        <p>
          Monthly plan checks compare three complete months of recorded spending
          with today’s monthly budgets. Enable Advanced Reporting with Premium
          to use this view.
        </p>
        <Link className="nl-secondary" href="/new/settings/features">
          Manage report features
        </Link>
      </section>
    );
  const months = report.months;
  const max = Math.max(...months.map((m) => m.expenses), 1);
  return (
    <>
      <section className="nl-plan-review-intro">
        <div>
          <p className="nl-eyebrow">
            Three complete months · {monthName(months[0].month)} –{" "}
            {monthName(months[2].month)}
          </p>
          <h2>Does your monthly plan fit your life?</h2>
          <p>
            Compare the average spending in your history with the monthly
            amounts you’ve set today. Yearly costs, reserves, and goals need
            different planning, so they are left out of the comparison below.
          </p>
          <p className="nl-report-qualification">
            Bars compare recorded spending between months. These are current
            targets, not historical budgets. Complete all three months of
            imports before treating an average as representative.
          </p>
        </div>
        <div
          className="nl-month-history"
          aria-label="Recorded monthly spending"
        >
          {months.map((m) => (
            <Link
              key={m.month}
              href={`/new/transactions?startDate=${m.month}-01&endDate=${new Date(Date.UTC(Number(m.month.slice(0, 4)), Number(m.month.slice(5, 7)), 0)).toISOString().slice(0, 10)}&transactionType=expense`}
            >
              <span>{monthName(m.month)}</span>
              <div className="nl-meter">
                <span style={{ width: `${(m.expenses / max) * 100}%` }} />
              </div>
              <strong>{money(m.expenses)}</strong>
              <small>{m.count} transactions recorded</small>
            </Link>
          ))}
        </div>
      </section>
      {report.period && (
        <p className="nl-footnote">
          This view always uses the last three complete calendar months. Date
          and envelope filters on Spending review do not change this comparison.
        </p>
      )}
      <section className="nl-panel nl-plan-comparison">
        <div className="nl-section-title">
          <div>
            <p className="nl-eyebrow">Your everyday envelopes</p>
            <h2>Amounts worth a second look</h2>
          </div>
          <Link href="/new/income">Review planned income →</Link>
        </div>
        <div className="nl-plan-table-head">
          <span>Envelope</span>
          <span>Current monthly budget</span>
          <span>Average recorded spending</span>
          <span>Difference</span>
          <span />
        </div>
        {report.plan.map((c) => {
          const delta =
            (cents(c.averageExpenses) - cents(c.monthlyBudget)) / 100;
          return (
            <article key={c.id}>
              <div>
                <Link href={`/new/budget/${c.id}`}>{c.name}</Link>
                <small>
                  Spending recorded in {c.monthsWithSpending} of 3 months
                </small>
                {c.averageIncoming > 0 && (
                  <small>
                    {money(c.averageIncoming)} average money in, separate
                  </small>
                )}
              </div>
              <div>
                <span className="nl-mobile-label">Monthly budget</span>
                <strong>{money(c.monthlyBudget)}</strong>
              </div>
              <div>
                <span className="nl-mobile-label">Average spending</span>
                <strong>{money(c.averageExpenses)}</strong>
              </div>
              <div>
                <strong>{money(Math.abs(delta))}</strong>
                <small>
                  {delta > 0
                    ? "spending above budget"
                    : delta < 0
                      ? "spending below budget"
                      : "matches budget"}
                </small>
              </div>
              <Link
                className="nl-secondary"
                href={`/new/budget/manage?edit=${c.id}`}
              >
                Review plan
              </Link>
            </article>
          );
        })}
        {!report.plan.length && (
          <div className="nl-position-empty">
            <h3>Build a little history first</h3>
            <p>
              No spending is recorded in everyday envelopes for these months.
              Import past statements to make this comparison useful.
            </p>
            <Link href="/new/imports">Import transactions →</Link>
          </div>
        )}
      </section>
    </>
  );
}
