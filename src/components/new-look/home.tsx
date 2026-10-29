"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, CalendarDays } from "lucide-react";
import { useCheckinSteps, CheckinLoadError } from "./checkin-flow";
import {
  money,
  ordinaryEnvelopes,
  hasMoneyToAllocate,
  type Cadence,
} from "@/lib/new-look";
import { AvailableBuffer } from "./available-buffer";
import { HomeNetWorth } from "./home-net-worth";
import { HomeEnvelopes } from "./home-envelopes";
import { useBudget, useCheckins, DataBoundary } from "./budget-context";
import { AvailableCalculation } from "./common";
import { useFeatures } from "@/contexts/FeatureContext";
import {
  HomeHeading,
  HomeSkeleton,
  HomeSkeletonContent,
  HomeNextSkeleton,
  HomeTasksSkeleton,
  SkeletonLine,
} from "./home-skeleton";
import { CheckinRoutines } from "./checkin-routines";
import {
  checkinStatus,
  checkinStatusLabel,
  checkinCompletedLabel,
} from "@/lib/checkins";

export function GuidedHome() {
  const query = useSearchParams();
  const value = query.get("checkin");
  const cadence: Cadence =
    value === "weekly" || value === "monthly" ? value : "daily";
  const features = useFeatures();
  const showBuffer =
    !features.error &&
    features.hasPremium &&
    features.isFeatureEnabled("income_buffer");
  const showNetWorth =
    !features.error &&
    features.hasPremium &&
    features.isFeatureEnabled("retirement_planning");
  const planning =
    showBuffer ||
    (!features.error &&
      features.hasPremium &&
      features.isFeatureEnabled("goals"));
  // A local-only, persistent preview makes a brief loading state easy to review.
  if (
    process.env.NODE_ENV === "development" &&
    query.get("preview") === "loading"
  ) {
    return (
      <>
        <div className="nl-notice nl-loading-preview">
          <span>Loading preview · actual dashboard placeholders</span>
          <Link className="nl-secondary" href={`/new?checkin=${cadence}`}>
            Show loaded dashboard →
          </Link>
        </div>
        <HomeSkeleton
          cadence={cadence}
          showBuffer={showBuffer}
          showNetWorth={showNetWorth}
          planning={planning}
        />
      </>
    );
  }
  return (
    <>
      <HomeHeading cadence={cadence} />
      <CheckinRoutines selected={cadence} />
      <DataBoundary
        fallback={
          <HomeSkeletonContent
            cadence={cadence}
            showBuffer={showBuffer}
            showNetWorth={showNetWorth}
            planning={planning}
          />
        }
      >
        <HomeContent cadence={cadence} />
      </DataBoundary>
    </>
  );
}
function HomeContent({ cadence }: { cadence: Cadence }) {
  const { data } = useBudget();
  const {
    items,
    ready,
    period,
    completedAt,
    error: progressError,
    retry: retryProgress,
  } = useCheckins(cadence);
  const {
    steps,
    loading,
    error: stepsError,
    retry: retrySteps,
  } = useCheckinSteps(cadence);
  const error = progressError || stepsError;
  const retry = async () => {
    await Promise.all([retryProgress(), retrySteps()]);
  };
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
  const status = checkinStatus(tasks, items, completedAt);
  const known = ready && !loading && !error;
  const complete = known && status.state === "complete";
  const next = complete ? undefined : tasks.find((t) => !items[t.key]);
  const periodWord =
    cadence === "daily"
      ? "today"
      : cadence === "weekly"
        ? "this week"
        : "this month";
  return (
    <>
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
          <AvailableBuffer key={data.identity.activeAccountId} />
        </div>
        <div className="nl-hero-next">
          <p className="nl-eyebrow">
            {complete ? "Check-in complete" : "Your next step"}
          </p>
          {!known && !error ? (
            <HomeNextSkeleton />
          ) : (
            <h2>
              {complete
                ? `You’re all set for ${periodWord}`
                : next?.title || "Your check-in"}
            </h2>
          )}
          {known && (
            <p>
              {complete
                ? "You’ve finished this review. Use your budget whenever you need it; your next check-in will be ready automatically."
                : next?.detail}
            </p>
          )}
          {complete && status.completedAt && (
            <div className="nl-routine-receipt" role="status">
              <span>
                <Check size={16} aria-hidden="true" />{" "}
                {checkinCompletedLabel(status.completedAt)}
              </span>
              <span>
                Next {cadence} check-in: {period.nextLabel}
              </span>
            </div>
          )}
          {error ? (
            <CheckinLoadError retry={retry} />
          ) : !known ? null : next ? (
            <Link
              className="nl-primary"
              href={`${next.href}?checkin=${cadence}`}
            >
              {status.done ? "Continue check-in" : "Start check-in"}
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
            <h2>{cadence[0].toUpperCase() + cadence.slice(1)} check-in</h2>
            <span className="nl-tag">
              {known ? (
                complete ? (
                  checkinStatusLabel(cadence, status.state)
                ) : (
                  `${status.done} of ${tasks.length} reviewed`
                )
              ) : error ? (
                "Status unavailable"
              ) : (
                <SkeletonLine width={80} />
              )}
            </span>
          </div>
          {!known && !error ? (
            <HomeTasksSkeleton count={tasks.length} />
          ) : (
            <div className="nl-task-list">
              {tasks.map((t, i) => (
                <Link
                  className="nl-task"
                  key={t.key}
                  href={complete ? t.href : `${t.href}?checkin=${cadence}`}
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
          )}
          <p className="nl-footnote">
            {complete
              ? "Your review is saved. You can revisit any page without clearing this check-in."
              : "Finish each step to complete this check-in. Reviewing is enough; you don’t need to change anything."}{" "}
            Progress is saved to your account for this budget.
          </p>
          <HomeEnvelopes />
        </div>
        <aside className="nl-aside-stack">
          {hasMoneyToAllocate(data.summary) && (
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
          )}
          <section className="nl-panel">
            <h2 className="nl-icon-heading">
              <CalendarDays
                className="nl-accent"
                size={21}
                aria-hidden="true"
              />
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
          <HomeNetWorth />
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
