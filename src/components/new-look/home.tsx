"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, CalendarDays } from "lucide-react";
import { useCheckinSteps, CheckinLoadError } from "./checkin-flow";
import { money, ordinaryEnvelopes, type Cadence } from "@/lib/new-look";
import { envelopeReviewHref } from "@/lib/envelope-navigation";
import { useBudget, useCheckins, DataBoundary } from "./budget-context";
import { PageHeading, AvailableCalculation } from "./common";

export function GuidedHome() {
  return (
    <DataBoundary>
      <HomeContent />
    </DataBoundary>
  );
}
function HomeContent() {
  const { data } = useBudget();
  const router = useRouter();
  const query = useSearchParams();
  const value = query.get("checkin");
  const cadence: Cadence =
    value === "weekly" || value === "monthly" ? value : "daily";
  const { items, ready } = useCheckins(cadence);
  const { steps, loading, error, retry } = useCheckinSteps(cadence);
  if (!data) return null;
  const envelopes = ordinaryEnvelopes(data.categories);
  const negative = envelopes.filter((c) => c.current_balance < 0);
  const tasks = steps.map((step) => ({
    ...step,
    detail:
      cadence === "daily" && step.key === "accounts"
        ? `${data.accounts.length + data.cards.length} accounts and cards to check. Update bank balances and available credit, then review your envelopes.`
        : cadence === "daily" && step.key === "budget" && negative.length
          ? `${negative.length} negative ${negative.length === 1 ? "balance" : "balances"} to consider. Scan the rest before deciding what you can spend.`
          : step.detail,
  }));
  const done = tasks.filter((t) => items[t.key]).length;
  const next = tasks.find((t) => !items[t.key]);
  const month = new Date().toLocaleDateString("en-US", { month: "long" });
  return (
    <>
      <PageHeading
        eyebrow="Your money, your decisions"
        title={
          cadence === "daily"
            ? "A few minutes with your budget"
            : cadence === "weekly"
              ? "See the week. Adjust the plan."
              : "Make room for the month ahead"
        }
        description={
          cadence === "daily"
            ? "Refresh the picture. Check before spending. Carry on with your day."
            : "A little attention now gives your next decisions better context."
        }
      />
      <div className="nl-tabs" aria-label="Check-in cadence">
        {(["daily", "weekly", "monthly"] as const).map((c) => (
          <button
            key={c}
            aria-pressed={cadence === c}
            className={cadence === c ? "active" : ""}
            onClick={() =>
              router.replace(`/new?checkin=${c}`, { scroll: false })
            }
          >
            {c[0].toUpperCase() + c.slice(1)} check-in
          </button>
        ))}
      </div>
      <section className="nl-hero">
        <div className="nl-hero-money">
          <p className="nl-eyebrow">Available to save</p>
          <div
            className={`nl-big-number ${data.summary.current_savings < 0 ? "nl-negative" : ""}`}
          >
            {money(data.summary.current_savings)}
          </div>
          <p>Unallocated funds · based on recorded balances</p>
          <AvailableCalculation />
        </div>
        <div className="nl-hero-next">
          <p className="nl-eyebrow">Your next step</p>
          <h2>{next?.title || "Your check-in is complete"}</h2>
          <p>
            {next?.detail ||
              "You’ve reviewed what matters for this check-in. You can revisit any step whenever you need to."}
          </p>
          {error ? (
            <CheckinLoadError retry={retry} />
          ) : !ready || loading ? (
            <p role="status">Loading your check-in…</p>
          ) : next ? (
            <Link
              className="nl-primary"
              href={`${next.href}?checkin=${cadence}`}
            >
              {done ? "Continue check-in" : "Start check-in"}
              <ArrowRight size={16} />
            </Link>
          ) : (
            <Link
              className="nl-secondary"
              href={`/new/check-in/complete?checkin=${cadence}`}
            >
              View check-in summary
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </section>
      <div className="nl-two-column">
        <div>
          <div className="nl-section-title">
            <h2>
              {cadence === "daily"
                ? "Today"
                : cadence === "weekly"
                  ? "This week"
                  : month}{" "}
              · your check-in
            </h2>
            <span className="nl-tag">
              {done} / {tasks.length}
            </span>
          </div>
          <div className="nl-task-list">
            {tasks.map((t, i) => (
              <Link
                className="nl-task"
                key={t.key}
                href={`${t.href}?checkin=${cadence}`}
              >
                <span className={`nl-step ${items[t.key] ? "is-done" : ""}`}>
                  {items[t.key] ? <Check size={16} /> : i + 1}
                </span>
                <div>
                  <h3>{t.title}</h3>
                  <p>{t.detail}</p>
                </div>
                <ArrowRight size={18} />
              </Link>
            ))}
          </div>
          <p className="nl-footnote">
            Each step leads to the next. Finish after you’ve reviewed; you don’t
            need to change anything. Checkmarks are saved for this user and
            household in this browser.
          </p>
          <div className="nl-section-title">
            <h2>
              {negative.length
                ? "Envelopes needing a look"
                : "Your envelopes at a glance"}
            </h2>
            <Link href="/new/budget">All envelopes →</Link>
          </div>
          <div className="nl-list">
            {(negative.length ? negative : envelopes).slice(0, 4).map((c) => (
              <div key={c.id} className="nl-home-envelope">
              <Link href={envelopeReviewHref(c.id, "activity")}>
                <div>
                  <h3>{c.name}</h3>
                  <p>
                    {c.current_balance < 0
                      ? "Negative balance · consider covering"
                      : "Current balance"}
                  </p>
                </div>
                <strong className={c.current_balance < 0 ? "nl-negative" : ""}>
                  {money(c.current_balance)} →
                </strong>
              </Link>
              {c.current_balance < 0 && (
                <Link
                  className="nl-activity-link nl-cover-overage"
                  aria-label={`Cover overage in ${c.name}`}
                  href={envelopeReviewHref(c.id, "transfer")}
                >
                  Cover overage →
                </Link>
              )}
              </div>
            ))}
            {envelopes.length === 0 && (
              <div className="nl-panel">
                <h3>Your envelopes start here</h3>
                <p>
                  Create your envelopes, then return to plan and
                  review them here.
                </p>
                <Link href="/new/budget/manage?edit=new" className="nl-secondary">
                  Set up envelopes →
                </Link>
              </div>
            )}
          </div>
        </div>
        <aside className="nl-aside-stack">
          <section className="nl-panel">
            <p className="nl-eyebrow">When you get paid</p>
            <h2>Give this paycheck a job</h2>
            <p>
              Use what has arrived. What you already funded this month stays
              visible.
            </p>
            <Link className="nl-primary" href="/new/payday">
              Allocate this paycheck
              <ArrowRight size={16} />
            </Link>
          </section>
          <section className="nl-panel">
            <h2 className="nl-icon-heading">
              <CalendarDays className="nl-accent" size={21} aria-hidden="true" />
              <span>Your monthly plan</span>
            </h2>
            <dl className="nl-metrics">
              <div>
                <dt>Planned monthly funding</dt>
                <dd>{money(data.summary.total_monthly_budget)}</dd>
              </div>
              <div>
                <dt>Monthly net income</dt>
                <dd>{money(data.summary.monthly_net_income)}</dd>
              </div>
            </dl>
            <Link href="/new/plan">Review the plan →</Link>
          </section>
          <p className="nl-footnote">
            Balance checks and CSV imports do different jobs. Keep balances
            current daily; import spending as often as you need to trust your
            envelopes.
          </p>
        </aside>
      </div>
    </>
  );
}
