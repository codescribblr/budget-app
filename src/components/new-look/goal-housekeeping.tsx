"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  GoalWithDetails,
  Loan,
  NonCashAsset,
  Account,
  CreditCard,
} from "@/lib/types";
import { goalSource, type ManagedEnvelope } from "@/lib/housekeeping";
import { goalEnvelopeProgress } from "@/lib/goals/calculations";
import { money } from "@/lib/new-look";
import { BudgetRequestError } from "@/lib/budget-request";
import { useBudget, budgetRequest } from "./budget-context";
import { useMoneyCommand } from "./use-money-command";
import { SetupDialog } from "./setup-dialog";
import { NativeSelect } from "./native-select";
import { SkeletonFields } from "./skeleton-sections";

type Candidate = {
  table:
    "categories" | "accounts" | "loans" | "credit_cards" | "non_cash_assets";
  id: number;
  revision?: string;
  name: string;
  progress: number;
  monthly?: number;
  included?: boolean;
  balance?: number;
  reserved?: number;
};
export function GoalHousekeeping({
  initial,
  action,
  canEdit,
  onClose,
  onSaved,
}: {
  initial: GoalWithDetails;
  action: "delete" | "relink";
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { data, refresh } = useBudget();
  const command = useMoneyCommand(data?.identity.activeAccountId);
  const [goal, setGoal] = useState(initial);
  const [options, setOptions] = useState<Candidate[] | null>(null);
  const [choice, setChoice] = useState("");
  const [review, setReview] = useState<Candidate | null>(null);
  const [confirmed, setConfirmed] = useState("");
  const [conflict, setConflict] = useState(false);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [reviewGeneration, setReviewGeneration] = useState(0);
  const source = goalSource(goal);
  const kind =
    goal.goal_type === "envelope"
      ? "envelope"
      : goal.goal_type === "account-linked"
        ? "account"
        : goal.goal_type === "asset-linked"
          ? "investment"
          : "debt";
  const request = useRef(0);
  const loadOptions = useCallback(async () => {
    const generation = ++request.current;
    try {
      const [all, envelopes, loans, assets, accounts, cards] =
        await Promise.all([
          budgetRequest<GoalWithDetails[]>("/api/goals"),
          goal.goal_type === "envelope"
            ? budgetRequest<ManagedEnvelope[]>("/api/categories/housekeeping")
            : Promise.resolve([]),
          goal.goal_type === "debt-paydown"
            ? budgetRequest<Loan[]>("/api/loans")
            : Promise.resolve([]),
          goal.goal_type === "asset-linked"
            ? budgetRequest<NonCashAsset[]>("/api/non-cash-assets")
            : Promise.resolve([]),
          goal.goal_type === "account-linked"
            ? budgetRequest<Account[]>("/api/accounts")
            : Promise.resolve([]),
          goal.goal_type === "debt-paydown"
            ? budgetRequest<CreditCard[]>("/api/credit-cards")
            : Promise.resolve([]),
        ]);
      const other = all.filter((g) => g.id !== goal.id);
      const candidates: Candidate[] = [
        ...envelopes
          .filter(
            (c) =>
              !c.is_system &&
              !c.is_buffer &&
              !c.is_archived &&
              !c.is_goal &&
              !c.linkedGoals.length,
          )
          .map((c) => ({
            table: "categories" as const,
            id: c.id,
            revision: c.revision,
            name: c.name,
            progress: goalEnvelopeProgress(
              c.current_balance,
              c.spending,
              goal.purpose,
            ),
            monthly: c.monthly_amount,
            reserved: c.current_balance,
          })),
        ...accounts
          .filter(
            (a) =>
              !a.linked_goal_id &&
              !other.some((g) => g.linked_account_id === a.id),
          )
          .map((a) => ({
            table: "accounts" as const,
            id: a.id,
            revision: a.revision,
            name: a.name,
            progress: a.balance,
            included: a.include_in_totals,
            balance: a.balance,
          })),
        ...loans
          .filter(
            (l) =>
              l.balance > 0 &&
              !other.some(
                (g) => g.status !== "completed" && g.linked_loan_id === l.id,
              ),
          )
          .map((l) => ({
            table: "loans" as const,
            id: l.id,
            revision: l.revision,
            name: l.name,
            progress: l.balance,
          })),
        ...cards
          .filter(
            (c) =>
              c.credit_limit - c.available_credit > 0 &&
              !other.some(
                (g) =>
                  g.status !== "completed" && g.linked_credit_card_id === c.id,
              ),
          )
          .map((c) => ({
            table: "credit_cards" as const,
            id: c.id,
            revision: c.revision,
            name: c.name,
            progress: c.credit_limit - c.available_credit,
            included: c.include_in_totals,
          })),
        ...assets
          .filter(
            (a) =>
              a.asset_type === "investment" &&
              !other.some(
                (g) =>
                  g.status !== "completed" &&
                  g.linked_non_cash_asset_id === a.id,
              ),
          )
          .map((a) => ({
            table: "non_cash_assets" as const,
            id: a.id,
            revision: a.revision,
            name: a.name,
            progress: Math.max(0, a.current_value),
          })),
      ].filter((c) => !(c.table === source?.table && c.id === source?.id));
      if (generation !== request.current) return null;
      setOptions(candidates);
      setLoadError("");
      return all;
    } catch (e) {
      if (generation === request.current)
        setLoadError(
          e instanceof Error ? e.message : "Could not load tracking choices.",
        );
      return null;
    }
    // This dialog keeps its reviewed snapshots until an explicit refresh.
  }, [
    goal.id,
    goal.goal_type,
    goal.purpose,
    source?.id,
    source?.table,
    reviewGeneration,
  ]);
  useEffect(() => {
    if (action === "relink") void loadOptions();
    return () => {
      request.current++;
    };
  }, [action, loadOptions]);
  const candidate = options?.find((c) => `${c.table}:${c.id}` === choice);
  const planDelta =
    review?.table === "categories"
      ? goal.monthly_contribution - (review.monthly ?? 0)
      : 0;
  const availableDelta =
    review?.table === "accounts" && review.included
      ? -(review.balance ?? 0)
      : 0;
  const sourceRevisions: Record<string, string | undefined> = {};
  if (source) sourceRevisions[`${source.table}:${source.id}`] = source.revision;
  if (review) sourceRevisions[`${review.table}:${review.id}`] = review.revision;
  async function latest() {
    setRefreshing(true);
    try {
      const next = await budgetRequest<GoalWithDetails>(
        `/api/goals/${goal.id}`,
      );
      setGoal(next);
      setReview(null);
      setConfirmed("");
      setConflict(false);
      if (action === "relink") {
        setOptions(null);
        setReviewGeneration((n) => n + 1);
      }
      await refresh();
    } catch (e) {
      if (e instanceof BudgetRequestError && e.status === 404) setMissing(true);
      else
        toast.error(
          e instanceof Error ? e.message : "Could not refresh the goal.",
        );
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <SetupDialog
      title={
        action === "delete"
          ? `Remove ${goal.name}?`
          : review
            ? "Review the tracking change"
            : `Change the tracked ${kind}`
      }
      description={
        action === "delete"
          ? "Remove the goal’s target and progress tracking. Keep the money and its history."
          : "Keep the goal’s purpose and choose what its progress follows."
      }
      dirty={!!choice || !!confirmed || command.uncertain}
      canEdit={canEdit}
      saveDisabled={
        conflict ||
        missing ||
        refreshing ||
        (action === "delete"
          ? confirmed !== goal.name
          : !review && (!candidate || !!loadError))
      }
      destructive={action === "delete"}
      saveLabel={
        command.uncertain
          ? "Check & finish this change"
          : action === "delete"
            ? "Remove goal"
            : review
              ? "Change tracking"
              : "Review change →"
      }
      onContinue={
        action === "relink" && !review
          ? () => {
              if (candidate) setReview({ ...candidate });
            }
          : undefined
      }
      onBack={review && !command.uncertain ? () => setReview(null) : undefined}
      onClose={onClose}
      onSave={async () => {
        try {
          await command.run("/api/goals/housekeeping", {
            command: {
              action,
              id: goal.id,
              revision: goal.revision,
              sourceRevisions,
              ...(review
                ? { source: { table: review.table, id: review.id } }
                : {}),
            },
          });
          toast.success(
            action === "delete"
              ? "Goal removed. Money and history kept."
              : "Goal tracking updated.",
          );
          await onSaved();
        } catch (e) {
          if (e instanceof BudgetRequestError && e.code === "STALE_RECORD")
            setConflict(true);
          throw e;
        }
      }}
    >
      {command.uncertain && (
        <p className="nl-notice" role="alert">
          Check this operation’s outcome before making another change.
        </p>
      )}
      <div className="nl-housekeeping-current">
        <span>Currently tracking</span>
        <strong>{source?.name ?? "Source unavailable"}</strong>
        <small>
          {money(goal.current_balance ?? 0)}{" "}
          {kind === "debt" ? "remaining" : "progress"} ·{" "}
          {money(goal.target_amount)}{" "}
          {kind === "debt" ? "starting debt" : "target"}
        </small>
      </div>
      {action === "delete" ? (
        <>
          <div className="nl-housekeeping-effects">
            {goal.linked_category && (
              <p>
                <strong>{goal.linked_category.name}</strong> stays as a regular
                envelope with {money(goal.linked_category.current_balance)} and
                its {money(goal.linked_category.monthly_amount)} monthly target.
                Its transactions and funding history stay available.
              </p>
            )}
            {goal.linked_account && (
              <p>
                <strong>{goal.linked_account.name}</strong> keeps its{" "}
                {money(goal.linked_account.balance)} balance and remains{" "}
                {goal.linked_account.include_in_totals
                  ? "included in"
                  : "excluded from"}{" "}
                Available to save. You can change that separately in account
                settings.
              </p>
            )}
            {goal.linked_credit_card && (
              <p>
                <strong>{goal.linked_credit_card.name}</strong> and its recorded
                debt stay in your accounts.
              </p>
            )}
            {goal.linked_loan && (
              <p>
                <strong>{goal.linked_loan.name}</strong> and its recorded debt
                stay in Loans.
              </p>
            )}
            {goal.linked_non_cash_asset && (
              <p>
                <strong>{goal.linked_non_cash_asset.name}</strong> and its
                recorded value stay in Assets.
              </p>
            )}
            {goal.funding_category && (
              <p>
                <strong>{goal.funding_category.name}</strong> keeps{" "}
                {money(goal.funding_category.current_balance)} and its{" "}
                {money(goal.funding_category.monthly_amount)} monthly target.
              </p>
            )}
            <p>Available to save and net worth stay unchanged.</p>
          </div>
          <label>
            Type “{goal.name}” to confirm
            <input
              disabled={command.uncertain}
              autoComplete="off"
              value={confirmed}
              onChange={(e) => setConfirmed(e.target.value)}
            />
          </label>
        </>
      ) : review ? (
        <>
          <div className="nl-housekeeping-current nl-housekeeping-next">
            <span>Track instead</span>
            <strong>{review.name}</strong>
            <small>
              {money(review.progress)}{" "}
              {kind === "debt"
                ? "starting debt · progress restarts at 0%"
                : "progress using its existing balance and history"}
            </small>
          </div>
          <div className="nl-housekeeping-effects">
            {kind === "envelope" && (
              <>
                <p>
                  <strong>{source?.name}</strong> keeps its money, history, and{" "}
                  {money(goal.linked_category?.monthly_amount ?? 0)} monthly
                  target as a regular envelope.
                </p>
                <p>
                  <strong>{review.name}</strong> keeps{" "}
                  {money(review.reserved ?? 0)}. Its monthly target changes from{" "}
                  {money(review.monthly ?? 0)} to{" "}
                  {money(goal.monthly_contribution)}. Existing{" "}
                  {goal.purpose === "reserve"
                    ? "available money"
                    : goal.purpose === "retirement"
                      ? "categorized contributions"
                      : "money and categorized spending"}{" "}
                  count toward this goal.
                </p>
                <div className="nl-setup-readout">
                  <span>Monthly funding plan change</span>
                  <strong>
                    {planDelta > 0 ? "+" : ""}
                    {money(planDelta)}
                  </strong>
                </div>
              </>
            )}
            {kind === "account" && (
              <>
                <p>
                  <strong>{source?.name}</strong> is unlinked and stays{" "}
                  {goal.linked_account?.include_in_totals
                    ? "included in"
                    : "excluded from"}{" "}
                  your budget totals.
                </p>
                <p>
                  <strong>{review.name}</strong> will be dedicated to this goal
                  and {review.included ? "excluded from" : "remain outside"}{" "}
                  Available to save.
                </p>
                <div className="nl-setup-readout">
                  <span>Available to save change</span>
                  <strong>
                    {availableDelta > 0 ? "+" : ""}
                    {money(availableDelta)}
                  </strong>
                </div>
              </>
            )}
            {kind === "debt" && (
              <>
                <p>
                  The previous {money(goal.target_amount)} starting debt is
                  replaced with {money(review.progress)}. Progress restarts
                  against this debt; your {money(goal.monthly_contribution)}{" "}
                  planned monthly payment is kept.
                </p>
                {review.table === "credit_cards" && (
                  <p>
                    Card progress uses total amount owed from limit minus
                    available credit, including recent spending.
                  </p>
                )}
                {goal.funding_category && (
                  <p>
                    <strong>{goal.funding_category.name}</strong> remains the
                    payment envelope. Its money and target stay unchanged.
                    {review.table === "credit_cards" && review.included
                      ? " This card’s debt already reduces Available to save. Adding money to the payment envelope reduces it again; don’t set aside the same payment twice."
                      : ""}
                  </p>
                )}
              </>
            )}
            {kind === "investment" && (
              <p>
                Progress follows the recorded value of{" "}
                <strong>{review.name}</strong>, including market gains and
                losses. Your {money(goal.target_amount)} target and{" "}
                {money(goal.monthly_contribution)} monthly plan are kept.
              </p>
            )}
            {kind !== "account" && (
              <p>
                Available to save stays unchanged. No money or transaction
                history moves.
              </p>
            )}
            {goal.status === "completed" && (
              <p>The goal reopens with the new source.</p>
            )}
          </div>
        </>
      ) : (
        <>
          {loadError ? (
            <p className="nl-notice" role="alert">
              {loadError}{" "}
              <button
                type="button"
                className="nl-secondary"
                onClick={() => void loadOptions()}
              >
                Try again
              </button>
            </p>
          ) : options === null ? (
            <SkeletonFields count={2} label="Loading tracking choices" />
          ) : (
            <label>
              Track a different {kind}
              <NativeSelect
                value={choice}
                onChange={(e) => setChoice(e.target.value)}
              >
                <option value="">
                  Choose {kind === "debt" ? "a" : "an"} {kind}…
                </option>
                {options.map((c) => (
                  <option
                    key={`${c.table}:${c.id}`}
                    value={`${c.table}:${c.id}`}
                  >
                    {c.name} · {money(c.progress)}{" "}
                    {kind === "debt" ? "owed" : "progress"}
                  </option>
                ))}
              </NativeSelect>
            </label>
          )}
          {options?.length === 0 && !loadError && (
            <p className="nl-setup-help">
              There isn’t another eligible {kind} in this budget. Create one
              first, or unlink it from its current goal.
            </p>
          )}
        </>
      )}
      {missing ? (
        <p className="nl-notice" role="alert">
          This goal was removed elsewhere. Close this dialog to return to your
          goals.
        </p>
      ) : conflict ? (
        <div className="nl-notice" role="alert">
          <p>
            The goal or a linked balance changed. Your choice is kept. Load the
            latest details and review the effect again.
          </p>
          <button
            type="button"
            className="nl-secondary"
            disabled={refreshing}
            onClick={() => void latest()}
          >
            {refreshing ? "Refreshing…" : "Review latest details"}
          </button>
        </div>
      ) : null}
    </SetupDialog>
  );
}
