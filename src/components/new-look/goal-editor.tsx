"use client";
import { useState } from "react";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { goalDraft, prepareGoal, type GoalDraft } from "@/lib/guided-goals";
import { money, parseMoney } from "@/lib/new-look";
import { getCreditCardBalanceOwed } from "@/lib/credit-card-balance";
import type { GoalWithDetails, Loan } from "@/lib/types";
import { budgetRequest, useBudget } from "./budget-context";
import { SetupDialog } from "./setup-dialog";

const types = [
  {
    value: "envelope",
    title: "Save in an envelope",
    detail:
      "Set money aside within this budget. Spending toward the goal still counts as progress.",
  },
  {
    value: "account-linked",
    title: "Track a separate account",
    detail:
      "Dedicate an entire account to this goal, outside your spending budget.",
  },
  {
    value: "debt-paydown",
    title: "Pay down a card or loan",
    detail: "See your debt fall as you update its recorded balance.",
  },
] as const;

export function GoalEditor({
  goal,
  goals,
  loans,
  canEdit,
  onClose,
  onSaved,
}: {
  goal?: GoalWithDetails;
  goals: GoalWithDetails[];
  loans: Loan[];
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { data } = useBudget();
  const [initial] = useState(() => goalDraft(goal));
  const [draft, setDraft] = useState(initial);
  const change = <K extends keyof GoalDraft>(key: K, value: GoalDraft[K]) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  const accounts = (data?.accounts ?? []).filter(
    (a) =>
      !a.linked_goal_id && !goals.some((g) => g.linked_account_id === a.id),
  );
  const cards = (data?.cards ?? []).filter(
    (a) =>
      !goals.some(
        (g) => g.status !== "completed" && g.linked_credit_card_id === a.id,
      ),
  );
  const availableLoans = loans.filter(
    (a) =>
      !goals.some((g) => g.status !== "completed" && g.linked_loan_id === a.id),
  );
  const selectedAccount = accounts.find(
    (a) => draft.source === `account:${a.id}`,
  );
  const selectedCard = cards.find((a) => draft.source === `card:${a.id}`);
  const selectedLoan = availableLoans.find(
    (a) => draft.source === `loan:${a.id}`,
  );
  const availableAfter =
    (data?.summary.current_savings ?? 0) -
    (selectedAccount?.include_in_totals ? selectedAccount.balance : 0);
  const monthly = parseMoney(draft.monthly);
  const monthlyPlan =
    (data?.summary.total_monthly_budget ?? 0) -
    (goal?.linked_category?.monthly_amount ?? 0) +
    (monthly ?? 0);
  return (
    <SetupDialog
      title={goal ? "Edit your goal" : "What are you working toward?"}
      description={
        goal
          ? "Adjust the target and pace. Your recorded balances stay as they are."
          : "Choose how to track it, then set a target and a pace you can sustain."
      }
      dirty={JSON.stringify(initial) !== JSON.stringify(draft)}
      canEdit={canEdit}
      saveLabel={goal ? "Save goal" : "Create goal"}
      onClose={onClose}
      onSave={async () => {
        const payload = prepareGoal(draft, goal);
        if (!goal && draft.type === "account-linked" && !selectedAccount)
          throw new Error("Choose an available account.");
        if (
          !goal &&
          draft.type === "debt-paydown" &&
          !selectedCard &&
          !selectedLoan
        )
          throw new Error("Choose an available card or loan.");
        if (
          !goal &&
          draft.type === "debt-paydown" &&
          (selectedCard
            ? getCreditCardBalanceOwed(selectedCard)
            : (selectedLoan?.balance ?? 0)) <= 0
        )
          throw new Error(
            "This debt is already paid off. Choose a card or loan with a balance to pay down.",
          );
        await budgetRequest(
          goal ? `/api/goals/${goal.id}` : "/api/goals",
          payload,
          goal ? "PATCH" : "POST",
        );
        await onSaved();
      }}
    >
      {!goal && (
        <fieldset className="nl-purpose-picker">
          <legend>How will you track this goal?</legend>
          {types.map((type) => (
            <label
              className="nl-purpose-option"
              key={type.value}
              data-selected={draft.type === type.value}
            >
              <input
                type="radio"
                name="goal-kind"
                value={type.value}
                checked={draft.type === type.value}
                onChange={() =>
                  setDraft((previous) => ({
                    ...previous,
                    type: type.value,
                    source: "",
                  }))
                }
              />
              <span>
                <strong>{type.title}</strong>
                <small>{type.detail}</small>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <label>
        Goal name
        <input
          required
          maxLength={255}
          value={draft.name}
          onChange={(e) => change("name", e.target.value)}
          placeholder="e.g. A summer trip together"
        />
      </label>
      {!goal && draft.type === "account-linked" && (
        <>
          <label>
            Account to dedicate
            <select
              value={draft.source}
              onChange={(e) => change("source", e.target.value)}
              required
            >
              <option value="">Choose an account</option>
              {accounts.map((a) => (
                <option value={`account:${a.id}`} key={a.id}>
                  {a.name} · {money(a.balance)}
                </option>
              ))}
            </select>
          </label>
          <p className="nl-setup-help">
            The entire balance counts toward this goal. Already-linked accounts
            are omitted.{" "}
            <Link href="/new/accounts/manage">Set up a separate account →</Link>
          </p>
          {selectedAccount && (
            <div className="nl-setup-preview">
              <span>Available to save after linking</span>
              <strong className={availableAfter < 0 ? "nl-negative" : ""}>
                {money(availableAfter)}
              </strong>
              <small>
                {selectedAccount.include_in_totals
                  ? `${money(selectedAccount.balance)} will be excluded from your budget totals. No money moves at your bank.`
                  : "This account is already excluded from budget totals. Linking it does not change available to save."}
                {availableAfter < 0 &&
                  " You will need to reduce envelope balances or include other funds to cover the shortfall."}
              </small>
            </div>
          )}
        </>
      )}
      {!goal && draft.type === "debt-paydown" && (
        <>
          <label>
            Card or loan
            <select
              required
              value={draft.source}
              onChange={(e) => change("source", e.target.value)}
            >
              <option value="">Choose a debt to track</option>
              <optgroup label="Credit cards">
                {cards.map((a) => (
                  <option key={a.id} value={`card:${a.id}`}>
                    {a.name} · {money(getCreditCardBalanceOwed(a))} owed
                  </option>
                ))}
              </optgroup>
              <optgroup label="Loans">
                {availableLoans.map((a) => (
                  <option key={a.id} value={`loan:${a.id}`}>
                    {a.name} · {money(a.balance)} owed
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <p className="nl-setup-help">
            Your recorded amount owed becomes the starting debt. Keep balances
            current to see progress.{" "}
            <Link href="/new/accounts">Update card balances →</Link> ·{" "}
            <Link href="/loans">Loan setup in classic ↗</Link>
          </p>
        </>
      )}
      {goal && (
        <div className="nl-setup-readout">
          <span>{types.find((t) => t.value === goal.goal_type)?.title}</span>
          <strong>
            {goal.linked_category?.name ||
              goal.linked_account?.name ||
              goal.linked_credit_card?.name ||
              goal.linked_loan?.name ||
              "Linked source unavailable"}
          </strong>
          {goal.goal_type === "debt-paydown" && (
            <small>
              Starting debt: {money(goal.target_amount)}. Editing this plan does
              not change it.
            </small>
          )}
        </div>
      )}
      <div className="nl-setup-field-grid">
        {draft.type !== "debt-paydown" && (
          <label>
            Target amount
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
          ? `This becomes the envelope’s monthly funding target. ${goal ? "Saving this plan does not move money." : "A new goal starts its envelope at $0; you choose when to allocate real money."}`
          : draft.type === "debt-paydown"
            ? "Used to estimate your pace. This does not schedule a payment or add a payment envelope to your monthly plan. Estimates exclude future interest and spending."
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
      {goal && (
        <div className="nl-switch-row nl-setup-switch">
          <label htmlFor="goal-paused">
            Pause tracking
            <small>
              Keep this goal for later. Its envelope funding target and money
              stay unchanged.
            </small>
          </label>
          <Switch
            id="goal-paused"
            checked={draft.paused}
            onCheckedChange={(value) => change("paused", value)}
          />
        </div>
      )}
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
