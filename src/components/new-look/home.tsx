"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, CalendarDays } from "lucide-react";
import { useFeatures } from "@/contexts/FeatureContext";
import { money, ordinaryEnvelopes, type Cadence } from "@/lib/new-look";
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
  const { isFeatureEnabled, hasPremium } = useFeatures();
  const router = useRouter();
  const query = useSearchParams();
  const value = query.get("checkin");
  const cadence: Cadence =
    value === "weekly" || value === "monthly" ? value : "daily";
  const { items } = useCheckins(cadence);
  if (!data) return null;
  const envelopes = ordinaryEnvelopes(data.categories);
  const negative = envelopes.filter((c) => c.current_balance < 0);
  const planning =
    hasPremium &&
    (isFeatureEnabled("goals") || isFeatureEnabled("income_buffer"));
  const tasks =
    cadence === "daily"
      ? [
          {
            key: "accounts",
            title: "Keep recorded balances current",
            detail: `${data.accounts.length + data.cards.length} accounts and cards to check. Update them together in one balance pass.`,
            href: "/new/accounts",
          },
          {
            key: "budget",
            title: "Check the envelopes you’ll use",
            detail: negative.length
              ? `${negative.length} negative ${negative.length === 1 ? "balance" : "balances"} to consider. Scan the rest before deciding what you can spend.`
              : "Scan your envelopes before spending. Move money only if it helps your plan.",
            href: "/new/budget",
          },
        ]
      : cadence === "weekly"
        ? [
            {
              key: "imports",
              title: "Catch up on where your money went",
              detail:
                "Import CSVs from your banks and cards. Review descriptions, categories, and duplicates before adding transactions.",
              href: "/new/imports",
            },
            {
              key: "reports",
              title: "Look at your spending",
              detail:
                "Choose the past week in Reports. Notice what changed and where spending is ahead of plan.",
              href: "/new/reports",
            },
            {
              key: "budget",
              title: "Bring your envelopes back into balance",
              detail:
                "Cover overages and reconsider money that could serve another purpose.",
              href: "/new/budget",
            },
          ]
        : [
            {
              key: "reports",
              title: "Reflect on the month",
              detail:
                "Choose the previous month in Reports. Use what actually happened to shape the next plan.",
              href: "/new/reports",
            },
            {
              key: "plan",
              title: "Make a realistic monthly plan",
              detail:
                "Review your income and funding targets. Make room for irregular expenses.",
              href: "/new/plan",
            },
            ...(planning
              ? [
                  {
                    key: "goals",
                    title: "Check your longer-term progress",
                    detail:
                      "Review enabled goals and your income buffer. Adjust only where your priorities have changed.",
                    href: "/new/goals",
                  },
                ]
              : []),
          ];
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
          {next ? (
            <Link
              className="nl-primary"
              href={`${next.href}?checkin=${cadence}`}
            >
              {done ? "Continue check-in" : "Start check-in"}
              <ArrowRight size={16} />
            </Link>
          ) : (
            <Link className="nl-secondary" href="/new/budget">
              Browse envelopes
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
            Reviewed means you looked, not that everything is perfect.
            Checkmarks are saved for this user and household in this browser.
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
              <Link key={c.id} href={`/new/budget?envelope=${c.id}`}>
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
            ))}
            {envelopes.length === 0 && (
              <div className="nl-panel">
                <h3>Your envelopes start here</h3>
                <p>
                  Create your categories in classic, then return to plan and
                  review them here.
                </p>
                <Link href="/categories" className="nl-secondary">
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
            <CalendarDays className="nl-accent" size={21} />
            <h2>Your monthly plan</h2>
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
