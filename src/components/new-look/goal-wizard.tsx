"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  CalendarDays,
  ShieldCheck,
  Sprout,
  Check,
} from "lucide-react";
import type {
  GoalPurpose,
  GoalWithDetails,
  Loan,
  NonCashAsset,
} from "@/lib/types";
import {
  goalDraft,
  goalPurposes,
  goalWorkflow,
  prepareGoal,
  type GoalDraft,
} from "@/lib/guided-goals";
import { money, parseMoney } from "@/lib/new-look";
import { getCreditCardBalanceOwed } from "@/lib/credit-card-balance";
import { budgetRequest, useBudget } from "./budget-context";
import { SetupDialog } from "./setup-dialog";

const icons = {
  debt: ArrowDownRight,
  purchase: CalendarDays,
  reserve: ShieldCheck,
  retirement: Sprout,
};
const steps = ["Your goal", "How to track it", "Your plan", "Ready to begin"];

export function GoalWizard({
  goals,
  loans,
  assets,
  canEdit,
  onClose,
  onSaved,
}: {
  goals: GoalWithDetails[];
  loans: Loan[];
  assets: NonCashAsset[];
  canEdit: boolean;
  onClose: () => void;
  onSaved: (id?: number) => Promise<void>;
}) {
  const { data } = useBudget();
  const [draft, setDraft] = useState<GoalDraft>(() => goalDraft());
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const submission = useRef<{ signature: string; key: string } | null>(null);
  const change = <K extends keyof GoalDraft>(key: K, value: GoalDraft[K]) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  const envelopes = (data?.categories ?? []).filter(
    (c) =>
      !c.is_system &&
      !c.is_buffer &&
      !c.is_archived &&
      !c.is_goal &&
      !goals.some(
        (g) => g.linked_category_id === c.id || g.funding_category_id === c.id,
      ),
  );
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
  const investments = assets.filter(
    (a) =>
      a.asset_type === "investment" &&
      !goals.some(
        (g) => g.status !== "completed" && g.linked_non_cash_asset_id === a.id,
      ),
  );
  const card = cards.find((c) => draft.source === `card:${c.id}`);
  const loan = availableLoans.find((c) => draft.source === `loan:${c.id}`);
  const account = accounts.find((c) => draft.source === `account:${c.id}`);
  const asset = investments.find((c) => draft.source === `asset:${c.id}`);
  const envelope = envelopes.find((c) => String(c.id) === draft.envelope);
  const payment = envelopes.find((c) => String(c.id) === draft.payment);
  const debt = draft.type === "debt-paydown";
  const monthly = parseMoney(draft.monthly) ?? 0;
  const planBefore = (data?.categories ?? [])
    .filter((c) => !c.is_system && !c.is_buffer && !c.is_archived)
    .reduce((sum, c) => sum + c.monthly_amount, 0);
  const planAfter =
    planBefore +
    (draft.type === "envelope"
      ? monthly - (envelope?.monthly_amount ?? 0)
      : draft.payment === "new"
        ? monthly
        : 0);
  const availableAfter =
    (data?.summary.current_savings ?? 0) -
    (draft.type === "account-linked" && account?.include_in_totals
      ? account.balance
      : 0);
  const workflow = goalWorkflow({
    goal_type: draft.type,
    purpose: draft.purpose,
    linked_credit_card: card,
    linked_account: account
      ? { ...account, include_in_totals: false }
      : undefined,
    funding_category_id: draft.payment !== "none" ? 1 : null,
  });
  const purpose = goalPurposes.find((p) => p.value === draft.purpose);

  function choosePurpose(value: GoalPurpose) {
    setDraft((previous) => ({
      ...goalDraft(),
      name: previous.name,
      notes: previous.notes,
      purpose: value,
      type:
        value === "debt"
          ? "debt-paydown"
          : value === "retirement"
            ? "asset-linked"
            : "envelope",
    }));
  }
  function go(next: number) {
    setStep(next);
    // Focus the new step after React has committed it, including when using a keyboard.
    requestAnimationFrame(() => {
      heading.current?.focus();
      heading.current?.scrollIntoView({ block: "nearest" });
    });
  }
  function validateSource() {
    if (debt && !card && !loan)
      throw new Error("Choose an available card or loan.");
    if (
      debt &&
      (card ? getCreditCardBalanceOwed(card) : (loan?.balance ?? 0)) <= 0
    )
      throw new Error("Choose a debt with a balance left to pay.");
    if (draft.type === "account-linked" && !account)
      throw new Error("Choose an available account.");
    if (draft.type === "asset-linked" && !asset)
      throw new Error(
        "Choose an investment asset, or track contributions from your budget.",
      );
    if (draft.type === "envelope" && draft.envelope !== "new" && !envelope)
      throw new Error("Choose an available envelope.");
    if (debt && draft.payment !== "none" && draft.payment !== "new" && !payment)
      throw new Error("Choose an available payment envelope.");
    if (debt && draft.payment === "new" && card?.include_in_totals)
      throw new Error(
        "This card already reserves its full balance in budget totals.",
      );
  }
  const setupSummary =
    draft.type === "envelope"
      ? envelope
        ? `Use “${envelope.name}”. Keep its money and history; switch to a monthly goal funding target of ${money(monthly)}.`
        : `Create “${draft.name || "your goal"}” as a new envelope with $0 in it and a ${money(monthly)} monthly target.`
      : draft.type === "account-linked"
        ? `Track all of “${account?.name}” and exclude its balance from budget totals. No envelope is created.`
        : draft.type === "asset-linked"
          ? `Track the recorded value of “${asset?.name}”. No envelope is created and your budget totals stay the same.`
          : draft.payment === "new"
            ? `Track “${card?.name || loan?.name}” and create an empty payment envelope with a ${money(monthly)} monthly target.`
            : payment
              ? `Track “${card?.name || loan?.name}” and show “${payment.name}” beside it. Its balance and ${money(payment.monthly_amount)} monthly funding target stay the same.`
              : `Track “${card?.name || loan?.name}”. No envelope is created or funded.`;
  return (
    <SetupDialog
      title="Give your goal a clear path"
      description="Start with what you want to do. We’ll connect the right tracking and explain what happens next."
      dirty={!!draft.purpose || !!draft.name}
      canEdit={canEdit}
      saveLabel={
        step === 3 ? "Create goal" : step === 2 ? "Review setup" : "Continue"
      }
      closeOnSave={false}
      onBack={step > 0 ? () => go(step - 1) : undefined}
      onContinue={
        step < 3
          ? () => {
              if (!draft.purpose)
                throw new Error("Choose what you want to work toward.");
              if (step >= 1) validateSource();
              if (step === 2) prepareGoal(draft);
              go(step + 1);
            }
          : undefined
      }
      onClose={onClose}
      onSave={async () => {
        validateSource();
        const payload = prepareGoal(draft);
        const signature = JSON.stringify(payload);
        if (submission.current?.signature !== signature)
          submission.current = { signature, key: crypto.randomUUID() };
        const result = await budgetRequest<GoalWithDetails>(
          "/api/goals",
          { ...payload, creation_key: submission.current.key },
          "POST",
        );
        await onSaved(result.id);
      }}
    >
      <ol className="nl-goal-steps" aria-label="Goal setup">
        {steps.map((label, i) => (
          <li
            key={label}
            aria-current={step === i ? "step" : undefined}
            data-complete={step > i}
          >
            <span>{step > i ? <Check size={13} /> : i + 1}</span>
            <small>{label}</small>
          </li>
        ))}
      </ol>
      <h3 ref={heading} tabIndex={-1} className="nl-wizard-heading">
        {step === 0
          ? "What would you like to accomplish?"
          : step === 1
            ? "Where should progress come from?"
            : step === 2
              ? "Choose a target and a comfortable pace"
              : "Here’s how your goal will work"}
      </h3>
      {step === 0 && (
        <fieldset className="nl-purpose-picker">
          <legend className="sr-only">Goal purpose</legend>
          {goalPurposes.map((p) => {
            const Icon = icons[p.value];
            return (
              <label
                className="nl-purpose-option"
                key={p.value}
                data-selected={draft.purpose === p.value}
              >
                <input
                  type="radio"
                  name="goal-purpose"
                  checked={draft.purpose === p.value}
                  onChange={() => choosePurpose(p.value)}
                />
                <Icon size={21} aria-hidden="true" />
                <span>
                  <strong>{p.title}</strong>
                  <small>{p.detail}</small>
                </span>
              </label>
            );
          })}
        </fieldset>
      )}
      {step === 1 && (
        <>
          {!debt && (
            <fieldset className="nl-purpose-picker">
              <legend>{purpose?.title}</legend>
              {(draft.purpose === "retirement"
                ? [
                    [
                      "asset-linked",
                      "Track my retirement account’s value",
                      "For a 401(k), IRA, or another investment recorded in Assets. Includes changes in market value.",
                    ],
                    [
                      "envelope",
                      "Make contributions from my budget",
                      "Set aside take-home money, then track contributions when you send them. For a specific contribution target or period.",
                    ],
                  ]
                : [
                    [
                      "envelope",
                      "Reserve money in my budget",
                      "Use an envelope while the money stays in your everyday bank accounts.",
                    ],
                    [
                      "account-linked",
                      "Dedicate a separate bank account",
                      "Track the whole account balance and keep it outside the spending budget.",
                    ],
                  ]
              ).map(([value, title, detail]) => (
                <label
                  className="nl-purpose-option"
                  key={value}
                  data-selected={draft.type === value}
                >
                  <input
                    type="radio"
                    name="goal-tracking"
                    checked={draft.type === value}
                    onChange={() =>
                      setDraft((p) => ({
                        ...p,
                        type: value as GoalDraft["type"],
                        source: "",
                      }))
                    }
                  />
                  <span>
                    <strong>{title}</strong>
                    <small>{detail}</small>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          {draft.type === "envelope" && (
            <>
              <label>
                Envelope
                <select
                  value={draft.envelope}
                  onChange={(e) => {
                    const found = envelopes.find(
                      (c) => String(c.id) === e.target.value,
                    );
                    setDraft((p) => ({
                      ...p,
                      envelope: e.target.value,
                      monthly: String(found?.monthly_amount ?? 0),
                    }));
                  }}
                >
                  <option value="new">Create a new, empty envelope</option>
                  {envelopes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {money(c.current_balance)} reserved
                    </option>
                  ))}
                </select>
              </label>
              <p className="nl-setup-help">
                {envelope
                  ? draft.purpose === "reserve"
                    ? "Its current balance becomes your starting reserve. Earlier spending will not count as progress."
                    : "This keeps the existing balance and all transaction history. Earlier spending categorized here will count toward this goal; choose a new envelope for a fresh period."
                  : "We’ll name the envelope after your goal. It starts at $0; you fund it later with money that is actually available."}
              </p>
              {draft.purpose === "retirement" && (
                <p className="nl-setup-callout">
                  For payroll deductions already taken out before your pay
                  arrives, use investment-value tracking instead.{" "}
                  <Link href="/new/income">
                    Review deductions in your income plan →
                  </Link>
                </p>
              )}
            </>
          )}
          {draft.type === "account-linked" && (
            <>
              <label>
                Account to dedicate
                <select
                  required
                  value={draft.source}
                  onChange={(e) => change("source", e.target.value)}
                >
                  <option value="">Choose an account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={`account:${a.id}`}>
                      {a.name} · {money(a.balance)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="nl-setup-help">
                Use an account devoted to this one goal.{" "}
                <Link href="/new/accounts/manage">Set up a bank account →</Link>
              </p>
              {account && (
                <div className="nl-setup-preview">
                  <span>Available to save after linking</span>
                  <strong className={availableAfter < 0 ? "nl-negative" : ""}>
                    {money(availableAfter)}
                  </strong>
                  <small>
                    {account.include_in_totals
                      ? `${money(account.balance)} will be excluded from budget totals.`
                      : "This account is already excluded from budget totals."}{" "}
                    No money moves at your bank.
                    {availableAfter < 0 &&
                      " Your envelopes would exceed the remaining budget money; adjust them before allocating more."}
                  </small>
                </div>
              )}
            </>
          )}
          {draft.type === "asset-linked" && (
            <>
              <label>
                Investment to track
                <select
                  required
                  value={draft.source}
                  onChange={(e) => change("source", e.target.value)}
                >
                  <option value="">Choose an investment</option>
                  {investments.map((a) => (
                    <option key={a.id} value={`asset:${a.id}`}>
                      {a.name} · {money(a.current_value)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="nl-setup-help">
                These come from your investment assets, not your everyday cash
                accounts.{" "}
                {investments.length === 0 &&
                  "You don’t have an available investment to link yet. "}
                <Link href="/non-cash-assets">
                  Manage investments in classic ↗
                </Link>
              </p>
              <p className="nl-setup-callout">
                Progress follows the value you record, including market gains
                and losses. The goal does not forecast investment returns or
                tell you how much you need to retire.
              </p>
            </>
          )}
          {debt && (
            <>
              <label>
                Card or loan
                <select
                  required
                  value={draft.source}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      source: e.target.value,
                      payment: "none",
                    }))
                  }
                >
                  <option value="">Choose the debt to pay off</option>
                  <optgroup label="Credit cards">
                    {cards.map((c) => (
                      <option key={c.id} value={`card:${c.id}`}>
                        {c.name} · {money(getCreditCardBalanceOwed(c))} owed
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Loans">
                    {availableLoans.map((c) => (
                      <option key={c.id} value={`loan:${c.id}`}>
                        {c.name} · {money(c.balance)} owed
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
              <p className="nl-setup-help">
                This goal pays off the entire recorded balance. Update an
                out-of-date balance before starting.{" "}
                <Link href="/new/accounts">Card balances →</Link> ·{" "}
                <Link href="/loans">Loans in classic ↗</Link>
              </p>
              {(card || loan) && (
                <>
                  <div className="nl-setup-preview">
                    <span>Starting debt → finish line</span>
                    <strong>
                      {money(
                        card ? getCreditCardBalanceOwed(card) : loan!.balance,
                      )}{" "}
                      → $0
                    </strong>
                    <small>
                      Payments, interest, and new borrowing change progress when
                      you update the recorded balance.
                    </small>
                  </div>
                  <label>
                    Money waiting for payments
                    <select
                      value={draft.payment}
                      onChange={(e) => change("payment", e.target.value)}
                    >
                      <option value="none">
                        {card?.include_in_totals
                          ? "Use the card balance already reserved in my budget"
                          : "Track debt without a payment envelope"}
                      </option>
                      {!card?.include_in_totals && (
                        <option value="new">
                          Create an empty payment envelope
                        </option>
                      )}
                      {envelopes.map((c) => (
                        <option key={c.id} value={c.id}>
                          Use {c.name} · {money(c.current_balance)} reserved
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="nl-setup-callout">
                    {card?.include_in_totals
                      ? `This card already deducts ${money(getCreditCardBalanceOwed(card))} from Available to save. An envelope is not required. You can connect one you already use, but its money is an additional earmark: the debt and the envelope both reduce Available to save.`
                      : "This debt is not deducted from Available to save. A payment envelope can reserve cash until you make a payment. The full debt still belongs in your longer-term planning."}
                  </p>
                  {payment && (
                    <p className="nl-setup-help">
                      We’ll show this envelope’s balance and activity alongside
                      your debt. Linking keeps its money and monthly target
                      unchanged. Money in it never counts as debt paid off.
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
      {step === 2 && (
        <>
          <label>
            Goal name
            <input
              required
              maxLength={255}
              value={draft.name}
              onChange={(e) => change("name", e.target.value)}
              placeholder={
                debt
                  ? "Pay off my card"
                  : draft.purpose === "reserve"
                    ? "Emergency reserve"
                    : draft.purpose === "retirement"
                      ? "Retirement contributions for this year"
                      : "A summer trip together"
              }
            />
          </label>
          {!debt && (
            <label>
              {draft.type === "asset-linked"
                ? "Target investment value"
                : draft.purpose === "retirement"
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
          {debt && (
            <p className="nl-setup-callout">
              Your starting debt is captured from the latest recorded balance
              when you create the goal. The finish line is $0 owed; it is not an
              envelope savings target.
            </p>
          )}
          <div className="nl-setup-field-grid">
            <label>
              {debt
                ? "Planned monthly payment"
                : "Planned monthly contribution"}
              <input
                required
                inputMode="decimal"
                value={draft.monthly}
                onChange={(e) => change("monthly", e.target.value)}
              />
            </label>
            <label>
              Target date (optional)
              <input
                type="date"
                value={draft.date}
                onChange={(e) => change("date", e.target.value)}
              />
            </label>
          </div>
          <p className="nl-setup-help">
            {draft.type === "envelope" || draft.payment === "new"
              ? "The monthly amount becomes this envelope’s funding target. You still choose when to allocate money; nothing is funded automatically."
              : "This amount estimates your pace. It does not schedule payments, move money, or change any envelope’s monthly target."}{" "}
            Enter $0 if you prefer to contribute whenever you can.
            {debt &&
              " Payoff estimates exclude future interest and new borrowing."}
            {draft.type === "asset-linked" &&
              " Estimates assume no investment gains or losses."}
          </p>
          <label>
            Notes (optional)
            <textarea
              rows={2}
              value={draft.notes}
              onChange={(e) => change("notes", e.target.value)}
              placeholder="Anything you want to remember about this goal"
            />
          </label>
        </>
      )}
      {step === 3 && (
        <>
          <div className="nl-setup-readout">
            <span>{purpose?.title}</span>
            <strong>{draft.name}</strong>
          </div>
          <div className="nl-goal-explanation">
            <h4>What will be set up</h4>
            <p>{setupSummary}</p>
          </div>
          <div className="nl-setup-preview">
            <span>{debt ? "Starting debt" : "Target"}</span>
            <strong>
              {money(
                debt
                  ? card
                    ? getCreditCardBalanceOwed(card)
                    : (loan?.balance ?? 0)
                  : (parseMoney(draft.target) ?? 0),
              )}
            </strong>
            <small>
              {money(monthly)} per month planned
              {draft.date ? ` · Target date ${draft.date}` : " · No deadline"}
            </small>
          </div>
          <dl className="nl-metrics">
            <div>
              <dt>Monthly envelope plan</dt>
              <dd>{money(planAfter)}</dd>
            </div>
            <div>
              <dt>Available to save after setup</dt>
              <dd className={availableAfter < 0 ? "nl-negative" : ""}>
                {money(availableAfter)}
              </dd>
            </div>
          </dl>
          {planAfter > (data?.summary.monthly_net_income ?? 0) && (
            <p className="nl-setup-callout">
              Your monthly envelope targets exceed your planned take-home
              income. Review the monthly plan before funding them.
            </p>
          )}
          <div className="nl-goal-explanation">
            <h4>Your next steps</h4>
            <ol className="nl-goal-workflow">
              {workflow.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </div>
          <p className="nl-setup-help">
            Creating this goal does not transfer or allocate money. You can
            review these steps inside the goal at any time.
          </p>
        </>
      )}
    </SetupDialog>
  );
}
