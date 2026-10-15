"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { money, ordinaryEnvelopes, type Cadence } from "@/lib/new-look";
import { useBudget, useCheckins, DataBoundary } from "./budget-context";
import { useCheckinSteps, CheckinLoadError } from "./checkin-flow";

export function CheckinComplete() {
  return (
    <DataBoundary>
      <CompletionContent />
    </DataBoundary>
  );
}
function CompletionContent() {
  const router = useRouter();
  const value = useSearchParams().get("checkin");
  const cadence: Cadence =
    value === "weekly" || value === "monthly" ? value : "daily";
  const { data, error } = useBudget();
  const { items, ready, restart } = useCheckins(cadence);
  const { steps, loading, error: stepsError, retry } = useCheckinSteps(cadence);
  if (stepsError) return <CheckinLoadError retry={retry} />;
  if (!data || !ready || loading)
    return <p role="status">Loading your check-in…</p>;
  const remaining = steps.find((step) => !items[step.key]);
  const negative = ordinaryEnvelopes(data.categories).filter(
    (c) => c.current_balance < 0,
  ).length;
  const title = `${cadence[0].toUpperCase() + cadence.slice(1)} check-in`;
  return (
    <div className="nl-checkin-summary">
      {!remaining && (
        <span className="nl-finish-icon">
          <Check size={28} aria-hidden="true" />
        </span>
      )}
      <p className="nl-eyebrow">
        {remaining
          ? "Pick up where you left off"
          : "A little attention, a clearer picture"}
      </p>
      <h1>
        {title} {remaining ? "in progress" : "complete"}
      </h1>
      <p className="nl-summary-intro">
        {remaining
          ? "Your review isn’t finished yet. Your progress is saved, so you can continue whenever you’re ready."
          : cadence === "daily"
            ? "You’ve checked your balances and reviewed your envelopes. You’re ready to carry on with your day."
            : cadence === "weekly"
              ? "You’ve reviewed imports, spending, and your envelopes. Let what you learned guide the week ahead."
              : "You’ve looked back and reviewed your plan for the month ahead."}
      </p>
      <section className="nl-panel">
        <h2>{remaining ? "Your progress" : "What you reviewed"}</h2>
        <ol className="nl-completion-list">
          {steps.map((step, index) => (
            <li key={step.key}>
              <span className={`nl-step ${items[step.key] ? "is-done" : ""}`}>
                {items[step.key] ? (
                  <Check size={16} aria-label="Reviewed" />
                ) : (
                  index + 1
                )}
              </span>
              <span>{step.title}</span>
              <Link
                href={`${step.href}?checkin=${cadence}`}
                aria-label={`${items[step.key] ? "Revisit" : "Review"} ${step.label.toLowerCase()}`}
              >
                {items[step.key] ? "Revisit" : "Review"} →
              </Link>
            </li>
          ))}
        </ol>
        {!error && (
          <div className="nl-completion-balance">
            <span>
              Available to save<small>Based on recorded balances</small>
            </span>
            <strong
              className={data.summary.current_savings < 0 ? "nl-negative" : ""}
            >
              {money(data.summary.current_savings)}
            </strong>
          </div>
        )}
        {!error && negative > 0 && (
          <p className="nl-summary-attention">
            {negative}{" "}
            {negative === 1
              ? "envelope still has a negative balance"
              : "envelopes still have negative balances"}
            . Reviewing doesn’t require resolving everything today.{" "}
            <Link
              href={cadence === "monthly" ? "/new/budget" : `/new/budget?checkin=${cadence}`}
            >
              Revisit envelopes →
            </Link>
          </p>
        )}
      </section>
      <div className="nl-summary-actions">
        {remaining ? (
          <Link
            className="nl-primary"
            href={`${remaining.href}?checkin=${cadence}`}
          >
            Continue check-in <ArrowRight size={16} />
          </Link>
        ) : (
          <Link className="nl-primary" href={`/new?checkin=${cadence}`}>
            Done · back to overview <Check size={16} />
          </Link>
        )}
        {remaining && (
          <Link href={`/new?checkin=${cadence}`}>Back to overview</Link>
        )}
        {!remaining && (
          <button
            className="nl-secondary"
            onClick={() => {
              restart();
              router.push(`${steps[0].href}?checkin=${cadence}`);
            }}
          >
            Review again
          </button>
        )}
      </div>
      {!remaining && (
        <p className="nl-summary-rhythm">
          {cadence === "daily" ? (
            <>
              Your weekly check-in brings spending into focus with CSV imports
              and a review of where your money went.{" "}
              <Link href="/new?checkin=weekly">See the weekly routine →</Link>
            </>
          ) : (
            <>
              When income arrives, give it a job with{" "}
              <Link href="/new/payday">paycheck allocation →</Link>
            </>
          )}
        </p>
      )}
      <p className="nl-footnote">
        Review progress is saved for this user and household in this browser. It
        records what you reviewed, not which accounts were imported or whether
        every overage was covered.
      </p>
    </div>
  );
}
