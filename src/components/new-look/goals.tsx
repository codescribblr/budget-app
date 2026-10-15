"use client";
import { useTaskCheckin } from "./checkin-flow";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useFeatures } from "@/contexts/FeatureContext";
import type { GoalWithDetails } from "@/lib/types";
import { money } from "@/lib/new-look";
import { budgetRequest } from "./budget-context";
import { PageHeading, TaskReturn, CheckinFooter } from "./common";

interface BufferStatus {
  balance: number;
  monthsOfRunway: number;
  monthlyBudget: number;
}
export function GuidedGoals() {
  const checkin = useTaskCheckin("goals");
  const {
    loading: featuresLoading,
    isFeatureEnabled,
    hasPremium,
  } = useFeatures();
  const goalsEnabled = hasPremium && isFeatureEnabled("goals");
  const bufferEnabled = hasPremium && isFeatureEnabled("income_buffer");
  const [goals, setGoals] = useState<GoalWithDetails[]>([]);
  const [buffer, setBuffer] = useState<BufferStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (featuresLoading) return;
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      goalsEnabled
        ? budgetRequest<GoalWithDetails[]>("/api/goals")
        : Promise.resolve([]),
      bufferEnabled
        ? budgetRequest<BufferStatus>("/api/income-buffer/status")
        : Promise.resolve(null),
    ])
      .then(([nextGoals, nextBuffer]) => {
        if (active) {
          setGoals(nextGoals);
          setBuffer(nextBuffer);
        }
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [featuresLoading, goalsEnabled, bufferEnabled, attempt]);
  return (
    <>
      <TaskReturn task="goals" cadence="monthly" />
      <PageHeading
        eyebrow={checkin ? "Monthly · look further ahead" : "Goals & buffer"}
        title="Progress beyond this month"
        description="Review the goals and buffer you’ve chosen to use. Keep the money working toward the priorities that still matter to you."
      />
      {loading ? (
        <p role="status">Loading your planning tools…</p>
      ) : error ? (
        <div className="nl-panel" role="alert">
          <p>{error}</p>
          <button
            className="nl-secondary"
            onClick={() => setAttempt(attempt + 1)}
          >
            Try again
          </button>
        </div>
      ) : (
        <div
          className="nl-aside-stack"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))",
          }}
        >
          {buffer && (
            <section className="nl-panel">
              <p className="nl-eyebrow">Income buffer</p>
              <h2>{money(buffer.balance)}</h2>
              <p>
                {buffer.monthlyBudget > 0
                  ? `${buffer.monthsOfRunway.toFixed(1)} months of your current funding plan.`
                  : "Set monthly funding targets to estimate coverage."}
              </p>
              <Link className="nl-secondary" href="/income-buffer">
                Manage buffer in classic ↗
              </Link>
            </section>
          )}
          {goalsEnabled &&
            goals
              .filter((g) => g.status !== "completed")
              .map((goal) => (
                <section className="nl-panel" key={goal.id}>
                  <p className="nl-eyebrow">
                    {goal.goal_type === "debt-paydown"
                      ? "Debt payoff"
                      : "Savings goal"}{" "}
                    · {goal.status}
                  </p>
                  <h2>{goal.name}</h2>
                  <dl className="nl-metrics">
                    <div>
                      <dt>
                        {goal.goal_type === "debt-paydown"
                          ? "Debt remaining"
                          : "Progress recorded"}
                      </dt>
                      <dd>{money(goal.current_balance || 0)}</dd>
                    </div>
                    <div>
                      <dt>
                        {goal.goal_type === "debt-paydown"
                          ? "Starting debt"
                          : "Target"}
                      </dt>
                      <dd>{money(goal.target_amount)}</dd>
                    </div>
                    <div>
                      <dt>Monthly contribution</dt>
                      <dd>{money(goal.monthly_contribution)}</dd>
                    </div>
                  </dl>
                  <p>
                    {goal.goal_type === "envelope"
                      ? "Progress includes money left in the envelope and spending categorized toward this goal."
                      : goal.target_date
                        ? `Target date: ${goal.target_date}`
                        : "No target date set."}
                  </p>
                  <Link href="/goals" className="nl-secondary">
                    Review goal in classic ↗
                  </Link>
                </section>
              ))}
          {goalsEnabled && !goals.some((g) => g.status !== "completed") && (
            <section className="nl-panel">
              <h2>No active goals</h2>
              <p>Create or revisit your goals when you’re ready.</p>
              <Link className="nl-secondary" href="/goals">
                Manage goals in classic ↗
              </Link>
            </section>
          )}
          {!goalsEnabled && !bufferEnabled && (
            <section className="nl-panel">
              <h2>Planning tools are optional</h2>
              <p>
                Your budget works without goals or an income buffer. You can
                explore these tools in settings.
              </p>
              <Link className="nl-secondary" href="/settings">
                Explore settings in classic ↗
              </Link>
            </section>
          )}
        </div>
      )}
      <p className="nl-footnote">
        This first version provides an overview. Creating goals, changing linked
        accounts, and buffer funding still use the existing classic tools.
      </p>
      <CheckinFooter
        task="goals"
        cadence="monthly"
        title="Still heading toward what matters?"
        description="Review your longer-term priorities and any changes you want to make. Finish when you’re ready."
        disabled={loading || featuresLoading || !!error}
      />
    </>
  );
}
