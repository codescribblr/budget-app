import { CalendarDays, ChartNoAxesCombined } from "lucide-react";
import { checkinSteps } from "@/lib/checkins";
import type { Cadence } from "@/lib/new-look";
import { PageHeading } from "./common";

/** Decorative placeholders never impersonate money, progress, or usable controls. */
export function SkeletonLine({
  width = "100%",
  height = 12,
  className = "",
}: {
  width?: string | number;
  height?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`nl-skeleton ${className}`}
      style={{ width, height }}
    />
  );
}

export function HomeHeading({ cadence = "daily" }: { cadence?: Cadence }) {
  return (
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
  );
}

export function HomeNextSkeleton() {
  return (
    <div
      className="nl-skeleton-next"
      role="status"
      aria-label="Loading your next check-in step"
    >
      <SkeletonLine width="76%" height={22} />
      <div className="nl-skeleton-copy">
        <SkeletonLine />
        <SkeletonLine width="84%" />
      </div>
      <SkeletonLine height={40} className="nl-skeleton-action" />
    </div>
  );
}

export function HomeTasksSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div
      className="nl-task-list"
      role="status"
      aria-label="Loading your check-in steps"
    >
      {Array.from({ length: count }, (_, i) => (
        <div className="nl-task nl-skeleton-task" key={i} aria-hidden="true">
          <SkeletonLine width={29} height={29} className="nl-skeleton-circle" />
          <div className="nl-skeleton-copy">
            <SkeletonLine width={i % 2 ? "63%" : "77%"} height={16} />
            <SkeletonLine />
            <SkeletonLine width="81%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomeEnvelopesSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading your recently used envelopes">
      <div className="nl-skeleton-copy nl-skeleton-envelope-intro">
        <SkeletonLine />
        <SkeletonLine width="65%" />
      </div>
      <div
        className="nl-envelope-list nl-home-envelope-list"
        aria-hidden="true"
      >
        <ul>
          {Array.from({ length: count }, (_, i) => (
            <li className="nl-envelope-row" key={i}>
              <div className="nl-envelope-name nl-skeleton-copy">
                <SkeletonLine width={i % 2 ? "58%" : "74%"} height={16} />
                <SkeletonLine width="65%" />
                <SkeletonLine width="85%" />
              </div>
              <div className="nl-envelope-money nl-skeleton-copy">
                <span className="nl-envelope-mobile-label">Money left</span>
                <SkeletonLine width="65%" height={25} />
                <SkeletonLine height={5} />
                <SkeletonLine width="85%" height={10} />
              </div>
              <div className="nl-envelope-budget">
                <span className="nl-envelope-mobile-label">Monthly budget</span>
                <SkeletonLine width={75} height={16} />
              </div>
              <div className="nl-envelope-funding">
                <span className="nl-envelope-mobile-label">
                  Funded this month
                </span>
                <SkeletonLine width={75} height={16} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function HomeWorthSkeleton() {
  return (
    <div
      className="nl-skeleton-worth"
      role="status"
      aria-label="Loading your net worth"
    >
      <SkeletonLine width="72%" height={32} />
      <SkeletonLine width="92%" />
    </div>
  );
}

export function HomeBufferSkeleton() {
  return (
    <div
      className="nl-available-buffer"
      role="status"
      aria-label="Loading your income buffer"
    >
      <div className="nl-available-buffer-balance">
        <SkeletonLine width={120} height={16} />
        <SkeletonLine width={100} />
      </div>
      <div className="nl-available-buffer-actions">
        <SkeletonLine width={126} height={36} />
        <SkeletonLine width={147} height={36} />
      </div>
      <div className="nl-skeleton-copy">
        <SkeletonLine width="88%" height={10} />
      </div>
    </div>
  );
}

export function HomeSkeletonContent({
  cadence = "daily",
  showBuffer = false,
  showNetWorth = false,
  planning = false,
}: {
  cadence?: Cadence;
  showBuffer?: boolean;
  showNetWorth?: boolean;
  planning?: boolean;
}) {
  return (
    <div role="status" aria-label="Loading your dashboard">
      <div aria-hidden="true">
        <section className="nl-hero">
          <div className="nl-hero-money">
            <p className="nl-eyebrow">Available to save</p>
            <div className="nl-big-number nl-skeleton-amount">
              <SkeletonLine width={210} height={38} />
            </div>
            <p>Unallocated funds · based on recorded balances</p>
            <div className="nl-calculation">
              <SkeletonLine width={225} />
            </div>
            {showBuffer && <HomeBufferSkeleton />}
          </div>
          <div className="nl-hero-next">
            <p className="nl-eyebrow">Your next step</p>
            <HomeNextSkeleton />
          </div>
        </section>
        <div className="nl-two-column">
          <div>
            <div className="nl-section-title">
              <h2>{cadence[0].toUpperCase() + cadence.slice(1)} check-in</h2>
              <SkeletonLine width={92} height={22} />
            </div>
            <HomeTasksSkeleton count={checkinSteps(cadence, planning).length} />
            <div className="nl-footnote nl-skeleton-copy">
              <SkeletonLine />
              <SkeletonLine width="78%" />
            </div>
            <section className="nl-home-envelopes">
              <div className="nl-section-title">
                <h2>Your envelopes at a glance</h2>
              </div>
              <HomeEnvelopesSkeleton />
            </section>
          </div>
          <aside className="nl-aside-stack">
            <section className="nl-panel">
              <h2 className="nl-icon-heading">
                <CalendarDays className="nl-accent" size={21} />
                <span>Your monthly plan</span>
              </h2>
              <dl className="nl-metrics">
                <div>
                  <dt>Planned monthly funding</dt>
                  <dd>
                    <SkeletonLine width={65} />
                  </dd>
                </div>
                <div>
                  <dt>Monthly net income</dt>
                  <dd>
                    <SkeletonLine width={65} />
                  </dd>
                </div>
              </dl>
              <div className="nl-skeleton-copy">
                <SkeletonLine width={124} />
              </div>
            </section>
            {showNetWorth && (
              <section className="nl-panel nl-worth-card">
                <h2 className="nl-icon-heading">
                  <ChartNoAxesCombined size={21} className="nl-accent" />
                  Your net worth
                </h2>
                <HomeWorthSkeleton />
                <SkeletonLine width={140} />
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

export function HomeSkeleton({
  cadence = "daily",
  showBuffer = false,
  showNetWorth = false,
  planning = false,
}: {
  cadence?: Cadence;
  showBuffer?: boolean;
  showNetWorth?: boolean;
  planning?: boolean;
}) {
  return (
    <>
      <HomeHeading cadence={cadence} />
      <div className="nl-routine-picker" aria-hidden="true">
        <div className="nl-tabs nl-routine-tabs nl-skeleton-tabs">
          {(["daily", "weekly", "monthly"] as const).map((value) => (
            <span
              key={value}
              className={value === cadence ? "active" : undefined}
            >
              {value[0].toUpperCase() + value.slice(1)}
              <SkeletonLine width={28} height={18} />
            </span>
          ))}
        </div>
        <div className="nl-routine-context">
          <SkeletonLine width={155} />
        </div>
      </div>
      <HomeSkeletonContent
        cadence={cadence}
        showBuffer={showBuffer}
        showNetWorth={showNetWorth}
        planning={planning}
      />
    </>
  );
}

/** Shown during account selection checks; no budget data or providers mount early. */
export function HomeLoadingShell() {
  return (
    <div className="new-look nl-shell">
      <aside className="nl-sidebar" aria-hidden="true">
        <div className="nl-brand nl-skeleton-brand">
          <SkeletonLine width={30} height={30} />
          <SkeletonLine width={116} height={18} />
        </div>
        <p className="nl-eyebrow nl-nav-label">Your budget</p>
        <div className="nl-skeleton-navigation">
          {Array.from({ length: 9 }, (_, i) => (
            <SkeletonLine key={i} width={`${60 + (i % 3) * 10}%`} height={18} />
          ))}
        </div>
      </aside>
      <div className="nl-workspace">
        <header className="nl-topbar" aria-hidden="true">
          <SkeletonLine width={128} />
          <SkeletonLine width={96} height={28} />
        </header>
        <main className="nl-main">
          <HomeSkeleton />
        </main>
      </div>
    </div>
  );
}
