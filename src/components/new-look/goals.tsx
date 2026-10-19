"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Plus, ShieldCheck, Target } from "lucide-react";
import { toast } from "sonner";
import { useFeatures } from "@/contexts/FeatureContext";
import type { GoalWithDetails, Loan } from "@/lib/types";
import { goalGuidance } from "@/lib/guided-goals";
import { money } from "@/lib/new-look";
import type { EnvelopeTab } from "@/lib/envelope-navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { budgetRequest, DataBoundary, useBudget } from "./budget-context";
import {
  PageHeading,
  TaskReturn,
  CheckinFooter,
  ReadOnlyNotice,
} from "./common";
import { useTaskCheckin } from "./checkin-flow";
import { GoalEditor } from "./goal-editor";
import { GuidedBuffer } from "./income-buffer";
import { EnvelopeActivity } from "./envelope-activity";
import { EnvelopeEditor } from "./envelopes";

export function GuidedGoals() {
  return (
    <DataBoundary>
      <GoalsContent />
    </DataBoundary>
  );
}
function GoalsContent() {
  const checkin = useTaskCheckin("goals");
  const { data, canEdit, refresh } = useBudget();
  const {
    loading: featuresLoading,
    isFeatureEnabled,
    hasPremium,
    error: featureError,
    refreshFeatures,
  } = useFeatures();
  const goalsEnabled = hasPremium && isFeatureEnabled("goals");
  const bufferEnabled = hasPremium && isFeatureEnabled("income_buffer");
  const [goals, setGoals] = useState<GoalWithDetails[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("current");
  const router = useRouter();
  const params = useSearchParams();
  const request = useRef(0);
  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError("");
    try {
      const [nextGoals, nextLoans] = await Promise.all(
        goalsEnabled
          ? [
              budgetRequest<GoalWithDetails[]>("/api/goals"),
              budgetRequest<Loan[]>("/api/loans"),
            ]
          : [Promise.resolve([]), Promise.resolve([])],
      );
      if (request.current === id) {
        setGoals(nextGoals);
        setLoans(nextLoans);
      }
    } catch (err) {
      if (request.current === id)
        setError(
          err instanceof Error
            ? err.message
            : "Your goals could not be loaded.",
        );
    } finally {
      if (request.current === id) setLoading(false);
    }
  }, [goalsEnabled]);
  useEffect(() => {
    if (!featuresLoading) void load();
    return () => {
      request.current++;
    };
  }, [load, featuresLoading, data?.identity.activeAccountId]);
  function openGoal(id: number | "new" | null, edit = false) {
    if (id === null && params.get("from") === "plan") {
      router.push(`/new/plan${checkin ? "?checkin=monthly" : ""}`);
      return;
    }
    const next = new URLSearchParams(params.toString());
    next.delete("category");
    next.delete("edit");
    next.delete("goal");
    if (id !== null) next.set("goal", String(id));
    if (edit) next.set("edit", "true");
    router.push(`/new/goals${next.size ? `?${next}` : ""}`, { scroll: false });
  }
  const selected = goals.find(
    (g) =>
      String(g.id) === params.get("goal") ||
      (g.linked_category_id !== null &&
        String(g.linked_category_id) === params.get("category")),
  );
  const creating = params.get("goal") === "new";
  const editing = creating || params.get("edit") === "true";
  const matches = (g: GoalWithDetails, value: string) =>
    value === "completed"
      ? g.status === "completed"
      : value === "paused"
        ? g.status === "paused"
        : g.status !== "completed" && g.status !== "paused";
  const attention = (g: GoalWithDetails) =>
    g.status === "overdue" ? 2 : g.target_date && !g.is_on_track ? 1 : 0;
  const shown = goals
    .filter((g) => matches(g, filter))
    .sort((a, b) => attention(b) - attention(a));
  const needsLook = shown.filter(
    (g) => g.status === "overdue" || (g.target_date && !g.is_on_track),
  ).length;
  const ready = !loading && !featuresLoading && !error && !featureError;
  async function saved() {
    toast.success(selected ? "Goal updated." : "Goal created.");
    // A successful write followed by a failed refresh must not invite another create.
    await Promise.all([
      load(),
      refresh().catch(() =>
        toast.error(
          "Saved, but budget refresh failed. Reload before making more changes.",
        ),
      ),
    ]);
  }
  return (
    <>
      <TaskReturn task="goals" cadence="monthly" />
      <PageHeading
        eyebrow={checkin ? "Monthly · look further ahead" : "Goals & buffer"}
        title="Make room for what’s next"
        description="Build breathing room and make steady progress toward the things that matter to you."
      >
        {goalsEnabled && (
          <button
            className="nl-primary"
            disabled={!canEdit || !ready}
            onClick={() => openGoal("new")}
          >
            <Plus size={16} /> New goal
          </button>
        )}
      </PageHeading>
      <ReadOnlyNotice />
      {featureError ? (
        <div className="nl-panel" role="alert">
          <p>We couldn’t load your planning settings.</p>
          <button
            className="nl-secondary"
            onClick={() => void refreshFeatures()}
          >
            Try again
          </button>
        </div>
      ) : featuresLoading ? (
        <p role="status">Loading your planning tools…</p>
      ) : (
        <div
          className={`nl-goals-layout ${!goalsEnabled || !bufferEnabled ? "nl-goals-single" : ""}`}
        >
          {goalsEnabled && (
            <section aria-label="Your goals" className="nl-goals-main">
              <div className="nl-section-title">
                <h2 className="nl-icon-heading">
                  <Target size={19} /> Your goals
                </h2>
                <span className="nl-muted">
                  {needsLook > 0 && filter === "current"
                    ? `${needsLook} worth revisiting`
                    : "One step at a time"}
                </span>
              </div>
              <div className="nl-tabs" aria-label="Filter goals">
                {[
                  ["current", "In progress"],
                  ["paused", "Paused"],
                  ["completed", "Reached"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={filter === value}
                    className={filter === value ? "active" : ""}
                    onClick={() => setFilter(value)}
                  >
                    {label}{" "}
                    <span>{goals.filter((g) => matches(g, value)).length}</span>
                  </button>
                ))}
              </div>
              {loading ? (
                <p role="status">Loading goals…</p>
              ) : error ? (
                <div className="nl-panel" role="alert">
                  <p>{error}</p>
                  <button className="nl-secondary" onClick={() => void load()}>
                    Try again
                  </button>
                </div>
              ) : (
                <div className="nl-goal-list">
                  {shown.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onOpen={() => openGoal(goal.id)}
                      onEdit={() => openGoal(goal.id, true)}
                      canEdit={canEdit}
                    />
                  ))}
                  {!shown.length && (
                    <div className="nl-panel nl-goal-empty">
                      <Target size={28} />
                      <h3>
                        {filter === "current"
                          ? "Give your next priority a place"
                          : filter === "paused"
                            ? "No goals on pause"
                            : "Milestones will appear here"}
                      </h3>
                      <p>
                        {filter === "current"
                          ? "A trip, a debt payoff, or something further away. Start with one goal and a monthly amount that fits."
                          : "You can always return to a goal to see its progress and details."}
                      </p>
                      {filter === "current" && (
                        <button
                          className="nl-secondary"
                          disabled={!canEdit}
                          onClick={() => openGoal("new")}
                        >
                          Create your first goal
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              <p className="nl-footnote">
                Progress follows your recorded balances and categorized
                spending. Monthly amounts describe your plan; they don’t prove
                money was added this month.
              </p>
            </section>
          )}
          {bufferEnabled && (
            <aside aria-label="Income buffer">
              <GuidedBuffer canEdit={canEdit && !featureError} />
            </aside>
          )}
          {!goalsEnabled && !bufferEnabled && (
            <section className="nl-panel">
              <h2 className="nl-icon-heading">
                <ShieldCheck size={20} /> Optional planning tools
              </h2>
              <p>
                Enable goals or an income buffer when you’re ready to plan
                further ahead.
              </p>
              <Link className="nl-secondary" href="/settings">
                Planning settings ↗
              </Link>
            </section>
          )}
        </div>
      )}
      {!loading &&
        !error &&
        !selected &&
        !creating &&
        (params.has("goal") || params.has("category")) && (
          <p role="status" className="nl-footnote">
            That goal is no longer available here. Choose a goal from the list.
          </p>
        )}
      {goalsEnabled &&
        !featuresLoading &&
        !featureError &&
        !error &&
        (creating || selected) &&
        (editing ? (
          <GoalEditor
            key={selected?.id ?? "new"}
            goal={selected}
            goals={goals}
            loans={loans}
            canEdit={canEdit && !loading}
            onClose={() => openGoal(null)}
            onSaved={saved}
          />
        ) : (
          selected && (
            <GoalDetails
              goal={selected}
              onClose={() => openGoal(null)}
              onEdit={() => openGoal(selected.id, true)}
              canEdit={canEdit && !loading}
              onRefresh={load}
            />
          )
        ))}
      <CheckinFooter
        task="goals"
        cadence="monthly"
        disabled={!ready || !!selected || creating}
        title="Still heading toward what matters?"
        description="Review the pace of your goals and the breathing room in your buffer, then finish your monthly check-in."
      />
    </>
  );
}

function goalDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function GoalCard({
  goal,
  onOpen,
  onEdit,
  canEdit,
}: {
  goal: GoalWithDetails;
  onOpen: () => void;
  onEdit: () => void;
  canEdit: boolean;
}) {
  const debt = goal.goal_type === "debt-paydown";
  const pct = Math.max(0, Math.min(100, goal.progress_percentage ?? 0));
  return (
    <article className="nl-panel nl-goal-card">
      <div className="nl-goal-card-heading">
        <div>
          <p className="nl-eyebrow">
            {debt
              ? "Debt payoff"
              : goal.goal_type === "envelope"
                ? "Goal envelope"
                : "Dedicated account"}
          </p>
          <h3>
            <button onClick={onOpen}>
              {goal.name} <ArrowUpRight size={17} />
            </button>
          </h3>
        </div>
        <span
          className={`nl-goal-status ${goal.status === "overdue" || (!goal.is_on_track && goal.target_date && goal.status === "active") ? "nl-warning" : ""}`}
        >
          {goalGuidance(goal)}
        </span>
      </div>
      <div className="nl-goal-amount">
        <strong>
          {money(
            debt
              ? Math.max(0, goal.current_balance ?? 0)
              : (goal.current_balance ?? 0),
          )}
        </strong>
        <span>
          {debt
            ? `left of ${money(goal.target_amount)} starting debt`
            : `of ${money(goal.target_amount)} target`}
        </span>
      </div>
      <div
        className="nl-goal-progress"
        role="progressbar"
        aria-label={`${goal.name} progress`}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="nl-goal-pace">
        <span>{money(goal.monthly_contribution)} / month planned</span>
        <span>
          {goal.target_date
            ? `By ${goalDate(goal.target_date)}`
            : "No deadline"}
        </span>
      </div>
      <div className="nl-goal-card-actions">
        <button className="nl-secondary" onClick={onOpen}>
          Review progress
        </button>
        <button
          className="nl-activity-link"
          disabled={!canEdit}
          onClick={onEdit}
        >
          Edit plan
        </button>
      </div>
    </article>
  );
}

function GoalDetails({
  goal,
  onClose,
  onEdit,
  canEdit,
  onRefresh,
}: {
  goal: GoalWithDetails;
  onClose: () => void;
  onEdit: () => void;
  canEdit: boolean;
  onRefresh: () => Promise<void>;
}) {
  const { data } = useBudget();
  const [tab, setTab] = useState("progress");
  const [moving, setMoving] = useState(false);
  const [moneyTab, setMoneyTab] = useState<EnvelopeTab>("adjust");
  const category =
    (moving
      ? data?.categories.find((c) => c.id === goal.linked_category_id)
      : null) ?? goal.linked_category;
  const debt = goal.goal_type === "debt-paydown";
  const funding = data?.funding.categories.find(
    (f) => f.categoryId === category?.id,
  );
  if (moving && category)
    return (
      <EnvelopeEditor
        category={category}
        mode={moneyTab}
        onTabChange={setMoneyTab}
        onClose={() => {
          setMoving(false);
          void onRefresh();
        }}
      />
    );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="new-look nl-goal-dialog sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{goal.name}</DialogTitle>
          <DialogDescription>
            {goalGuidance(goal)}.{" "}
            {goal.target_date
              ? `Target date: ${goalDate(goal.target_date)}.`
              : "No deadline set."}
          </DialogDescription>
        </DialogHeader>
        {category && (
          <div className="nl-tabs" aria-label="Goal view">
            <button
              className={tab === "progress" ? "active" : ""}
              aria-pressed={tab === "progress"}
              onClick={() => setTab("progress")}
            >
              Progress
            </button>
            <button
              className={tab === "activity" ? "active" : ""}
              aria-pressed={tab === "activity"}
              onClick={() => setTab("activity")}
            >
              Envelope activity
            </button>
          </div>
        )}
        <div className="nl-goal-detail-scroll">
          {tab === "activity" && category ? (
            <EnvelopeActivity
              categoryId={category.id}
              currentBalance={category.current_balance}
              funded={funding?.fundedAmount ?? 0}
              spent={data?.spending[category.id] ?? 0}
            />
          ) : (
            <>
              <dl className="nl-metrics">
                <div>
                  <dt>
                    {debt ? "Debt remaining" : "Progress toward your target"}
                  </dt>
                  <dd>{money(goal.current_balance ?? 0)}</dd>
                </div>
                <div>
                  <dt>{debt ? "Starting debt" : "Target"}</dt>
                  <dd>{money(goal.target_amount)}</dd>
                </div>
                <div>
                  <dt>
                    {debt
                      ? "Planned monthly payment"
                      : "Planned monthly contribution"}
                  </dt>
                  <dd>{money(goal.monthly_contribution)}</dd>
                </div>
              </dl>
              {category ? (
                <div className="nl-goal-explanation">
                  <h3>What counts as progress?</h3>
                  <dl className="nl-metrics">
                    <div>
                      <dt>Still in the envelope</dt>
                      <dd>{money(category.current_balance)}</dd>
                    </div>
                    <div>
                      <dt>Categorized spending, all time</dt>
                      <dd>{money(goal.categorized_spending ?? 0)}</dd>
                    </div>
                  </dl>
                  <p>
                    Spending toward this goal stays in your progress. Transfers
                    out reduce it.{" "}
                    {category.current_balance < 0
                      ? "This envelope is overdrawn. That shortage does not subtract spending already counted toward the goal; cover it in your envelope review."
                      : "Only the envelope balance is still available to spend."}
                  </p>
                </div>
              ) : (
                <p className="nl-goal-explanation">
                  {debt
                    ? `Tracks the recorded amount owed on ${goal.linked_credit_card?.name || goal.linked_loan?.name || "your linked debt"}. Update the balance after payments, interest, or new spending.`
                    : `Tracks the entire recorded balance of ${goal.linked_account?.name || "your linked account"}. ${goal.linked_account?.include_in_totals ? "This account is currently included in budget totals. Its balance has not been reserved separately from your spending budget." : "This money is excluded from available to save."}`}
                </p>
              )}
              {goal.status !== "completed" && goal.status !== "paused" && (
                <div className="nl-goal-explanation">
                  <h3>
                    {goal.status === "overdue"
                      ? "Give yourself a fresh plan"
                      : "Does this pace still fit?"}
                  </h3>
                  <p>
                    {goal.status === "overdue"
                      ? "The target date has passed. Choose a new date or continue without a deadline."
                      : goal.target_date
                        ? `About ${money(goal.required_monthly_contribution ?? 0)} per month is needed for the target date, based on today’s progress.`
                        : goal.projected_completion_date
                          ? `At the planned pace, the estimate is ${goalDate(goal.projected_completion_date)}.`
                          : "Set a monthly amount when you’re ready, or make progress whenever you can."}{" "}
                    {debt &&
                      "This is a simple estimate, without future interest or new spending."}
                  </p>
                </div>
              )}
              {goal.notes && (
                <div className="nl-goal-explanation">
                  <h3>Your notes</h3>
                  <p className="nl-preserve-lines">{goal.notes}</p>
                </div>
              )}
            </>
          )}
          <p className="nl-footnote">
            <Link href={`/goals/${goal.id}`}>
              Advanced goal tools in classic ↗
            </Link>
          </p>
        </div>
        <div className="nl-goal-detail-actions">
          <button className="nl-secondary" disabled={!canEdit} onClick={onEdit}>
            Edit goal
          </button>
          {category ? (
            <button
              className="nl-primary"
              disabled={!canEdit}
              onClick={() => {
                setMoneyTab("adjust");
                setMoving(true);
              }}
            >
              Add or release money →
            </button>
          ) : (
            <Link
              className="nl-primary"
              href={goal.linked_loan_id ? "/loans" : "/new/accounts"}
            >
              {goal.linked_loan_id
                ? "Update loan in classic ↗"
                : "Update recorded balance →"}
            </Link>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
