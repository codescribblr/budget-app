"use client";
import { NativeSelect } from "./native-select";
import { useState } from "react";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import {
  goalDraft,
  prepareGoal,
  goalProgressLabel,
  type GoalDraft,
} from "@/lib/guided-goals";
import { money, parseMoney } from "@/lib/new-look";
import type { GoalWithDetails, Loan, NonCashAsset } from "@/lib/types";
import { budgetRequest, useBudget } from "./budget-context";
import { SetupDialog } from "./setup-dialog";
import { GoalWizard } from "./goal-wizard";

type Props = {
  goal?: GoalWithDetails;
  goals: GoalWithDetails[];
  loans: Loan[];
  assets: NonCashAsset[];
  canEdit: boolean;
  onClose: () => void;
  onSaved: (id?: number) => Promise<void>;
};
export function GoalEditor(props: Props) {
  return props.goal ? (
    <ExistingGoalEditor {...props} goal={props.goal} />
  ) : (
    <GoalWizard {...props} />
  );
}
function ExistingGoalEditor({
  goal,
  goals,
  canEdit,
  onClose,
  onSaved,
}: Props & { goal: GoalWithDetails }) {
  const { data } = useBudget();
  const [initial] = useState(() => goalDraft(goal));
  const [draft, setDraft] = useState(initial);
  const change = <K extends keyof GoalDraft>(key: K, value: GoalDraft[K]) =>
    setDraft((p) => ({ ...p, [key]: value }));
  const monthly = parseMoney(draft.monthly);
  const monthlyPlan =
    (data?.summary.total_monthly_budget ?? 0) -
    (goal.linked_category?.monthly_amount ?? 0) +
    (monthly ?? 0);
  const paymentEnvelopes = (data?.categories ?? []).filter(
    (c) =>
      !c.is_system &&
      !c.is_buffer &&
      !c.is_archived &&
      !c.is_goal &&
      !goals.some(
        (g) =>
          g.id !== goal.id &&
          (g.linked_category_id === c.id || g.funding_category_id === c.id),
      ),
  );
  return (
    <SetupDialog
      title="Edit your goal"
      description="Adjust the target and pace. Your recorded balances stay as they are."
      dirty={JSON.stringify(initial) !== JSON.stringify(draft)}
      canEdit={canEdit}
      saveLabel="Save goal"
      onClose={onClose}
      onSave={async () => {
        await budgetRequest(
          `/api/goals/${goal.id}`,
          prepareGoal(draft, goal),
          "PATCH",
        );
        await onSaved();
      }}
    >
      <label>
        Goal name
        <input
          required
          maxLength={255}
          value={draft.name}
          onChange={(e) => change("name", e.target.value)}
        />
      </label>
      <div className="nl-setup-readout">
        <span>{goalProgressLabel(goal)}</span>
        <strong>
          {goal.linked_category?.name ||
            goal.linked_account?.name ||
            goal.linked_credit_card?.name ||
            goal.linked_loan?.name ||
            goal.linked_non_cash_asset?.name ||
            "Linked source unavailable"}
        </strong>
        {goal.goal_type === "debt-paydown" && (
          <small>
            Starting debt: {money(goal.target_amount)}. Editing this plan does
            not change it.
          </small>
        )}
      </div>
      {goal.goal_type === "debt-paydown" && (
        <>
          <label>
            Payment envelope (optional)
            <NativeSelect
              value={draft.payment}
              onChange={(e) => change("payment", e.target.value)}
            >
              <option value="none">No payment envelope</option>
              {goal.funding_category &&
                !paymentEnvelopes.some(
                  (c) => c.id === goal.funding_category_id,
                ) && (
                  <option value={goal.funding_category.id}>
                    {goal.funding_category.name} · existing link
                  </option>
                )}
              {paymentEnvelopes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {money(c.current_balance)} reserved
                </option>
              ))}
            </NativeSelect>
          </label>
          <p className="nl-setup-help">
            Link an envelope you already use so its money and activity appear
            beside the debt. Linking or unlinking does not move money or change
            its monthly target.
          </p>
          {goal.linked_credit_card?.include_in_totals && (
            <p className="nl-setup-callout">
              This card already deducts its full debt from Available to save.
              Money in a payment envelope is an additional earmark; both reduce
              available money.
            </p>
          )}
          <p className="nl-setup-help">
            <Link href="/new/budget/manage">Manage payment envelopes →</Link>
          </p>
        </>
      )}
      <div className="nl-setup-field-grid">
        {draft.type !== "debt-paydown" && (
          <label>
            {draft.type === "asset-linked"
              ? "Target investment value"
              : goal.purpose === "retirement"
                ? "Total contributions to make"
                : "Target amount"}
            <input
              required
              inputMode="decimal"
              value={draft.target}
              onChange={(e) => change("target", e.target.value)}
              placeholder="0.00"
            />
          </label>
        )}
        <label>
          Target date (optional)
          <input
            type="date"
            value={draft.date}
            onChange={(e) => change("date", e.target.value)}
          />
        </label>
      </div>
      <label>
        {draft.type === "debt-paydown"
          ? "Planned monthly payment"
          : "Planned monthly contribution"}
        <input
          required
          inputMode="decimal"
          value={draft.monthly}
          onChange={(e) => change("monthly", e.target.value)}
        />
      </label>
      <p className="nl-setup-help">
        {draft.type === "envelope"
          ? "This becomes the envelope’s monthly funding target. Saving this plan does not move money."
          : draft.type === "debt-paydown"
            ? "Used to estimate your pace. This does not schedule a payment or change a linked payment envelope’s funding target. Estimates exclude future interest and spending."
            : "Used to estimate your pace. This does not transfer money or add a funding target to your monthly plan."}
      </p>
      {draft.type === "envelope" && (
        <div className="nl-setup-preview">
          <span>Total monthly funding plan</span>
          <strong>{money(monthlyPlan)}</strong>
          <small>
            Against {money(data?.summary.monthly_net_income ?? 0)} planned
            monthly income.{" "}
            {monthlyPlan > (data?.summary.monthly_net_income ?? 0) &&
              "The plan is higher than your income; consider a slower pace."}
          </small>
        </div>
      )}
      <div className="nl-switch-row nl-setup-switch">
        <label htmlFor="goal-paused">
          Pause tracking
          <small>
            Keep this goal for later. Its envelope funding target and money stay
            unchanged.
          </small>
        </label>
        <Switch
          id="goal-paused"
          checked={draft.paused}
          onCheckedChange={(value) => change("paused", value)}
        />
      </div>
      <label>
        Notes (optional)
        <textarea
          rows={3}
          value={draft.notes}
          onChange={(e) => change("notes", e.target.value)}
        />
      </label>
    </SetupDialog>
  );
}
