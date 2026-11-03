"use client";
import { useId } from "react";
import type { Category, CreditCard } from "@/lib/types";
import { money } from "@/lib/new-look";
import { getCreditCardBalanceOwed } from "@/lib/credit-card-balance";
import { NativeSelect } from "./native-select";

/** A payment envelope organizes cash; the card/loan balance measures payoff progress. */
export function DebtPaymentChoice({
  value = "none",
  onChange,
  envelopes,
  card,
  linkedEnvelope,
  allowCreate = false,
}: {
  value?: string;
  onChange: (value: string) => void;
  envelopes: Category[];
  card?: CreditCard | null;
  linkedEnvelope?: Category | null;
  allowCreate?: boolean;
}) {
  const group = useId();
  const included = !!card?.include_in_totals;
  const mode = value === "none" || value === "new" ? value : "existing";
  const envelope = envelopes.find((item) => String(item.id) === value);
  const options = [
    {
      value: "none",
      title: "Just track my payoff",
      detail: included
        ? "No separate envelope. I’ll pay from my bank account and update my balances."
        : "I’ll manage payment money separately, without linking an envelope to this goal.",
    },
    {
      value: "existing",
      title: "Use my existing payment envelope",
      detail: "I already set money aside in an envelope for these payments.",
    },
    ...(!included && allowCreate
      ? [
          {
            value: "new",
            title: "Create a payment envelope",
            detail: "I want a place in my budget to save up between payments.",
          },
        ]
      : []),
  ];
  return (
    <section className="nl-debt-payment-choice" aria-label="Payment money">
      <fieldset className="nl-purpose-picker">
        <legend>How will you manage payment money?</legend>
        <p className="nl-setup-help nl-debt-payment-intro">
          Your goal tracks how much you still owe. An envelope tracks money you
          set aside before paying.
        </p>
        {options.map((option) => (
          <label
            className="nl-purpose-option"
            data-selected={mode === option.value}
            key={option.value}
          >
            <input
              type="radio"
              name={group}
              value={option.value}
              checked={mode === option.value}
              onChange={() =>
                onChange(
                  option.value === "existing"
                    ? envelope
                      ? String(envelope.id)
                      : "existing"
                    : option.value,
                )
              }
            />
            <span>
              <span className="nl-debt-payment-option-title">
                <strong>{option.title}</strong>
                {included && option.value === "none" && (
                  <span className="nl-tag">Recommended</span>
                )}
              </span>
              <small>{option.detail}</small>
            </span>
          </label>
        ))}
      </fieldset>
      {mode === "none" ? (
        <div className="nl-debt-payment-result">
          <strong>
            {included
              ? "No envelope needed for this card"
              : "Track the debt, manage payments separately"}
          </strong>
          <p>
            {included
              ? `Available to save already subtracts the ${money(getCreditCardBalanceOwed(card!))} you owe on this card. You don’t need to put that payment money in an envelope as well.`
              : "This goal won’t set aside any money. Use a payment envelope if you want to keep money for upcoming payments separate from the rest of your budget."}
          </p>
          <p className="nl-setup-help">
            Your planned monthly payment helps estimate your payoff date. You’ll
            still make payments at your bank or lender.
          </p>
          {linkedEnvelope && (
            <p className="nl-setup-help">
              Disconnecting “{linkedEnvelope.name}” only removes it from this
              goal. Its money stays in the envelope until you move it.
            </p>
          )}
        </div>
      ) : mode === "new" ? (
        <div className="nl-debt-payment-result">
          <strong>Save between payments, then pay when you’re ready</strong>
          <p>
            We’ll create an empty envelope named after your goal. In the next
            step, your planned monthly payment will become its monthly funding
            target.
          </p>
          <p className="nl-setup-help">
            After setup, add available money to the envelope. Make the payment
            at your bank or lender, then categorize the outgoing payment to this
            envelope and update your balances.
          </p>
        </div>
      ) : (
        <div className="nl-debt-payment-result">
          <label>
            Envelope you use for these payments
            <NativeSelect
              required
              value={envelope ? String(envelope.id) : ""}
              onChange={(e) => onChange(e.target.value || "existing")}
            >
              <option value="">Choose your payment envelope</option>
              {envelopes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {money(item.current_balance)} in envelope
                </option>
              ))}
            </NativeSelect>
          </label>
          {!envelopes.length && (
            <p className="nl-setup-help">
              No eligible envelopes are available. Choose{" "}
              {included || !allowCreate
                ? "“Just track my payoff”"
                : "“Create a payment envelope”"}{" "}
              to continue.
            </p>
          )}
          {envelope ? (
            <>
              <dl className="nl-debt-payment-facts">
                <div>
                  <dt>In {envelope.name}</dt>
                  <dd>{money(envelope.current_balance)}</dd>
                </div>
                <div>
                  <dt>Monthly funding target</dt>
                  <dd>{money(envelope.monthly_amount)}</dd>
                </div>
              </dl>
              <p>
                Its balance and activity will appear beside your debt.
                Connecting it does not change its money, monthly target, or
                Available to save.
              </p>
            </>
          ) : (
            <p className="nl-setup-help">
              Choose the envelope already used for this debt’s payments. Its
              balance and activity will appear on the goal.
            </p>
          )}
          {included ? (
            <div className="nl-debt-payment-caution">
              <strong>Avoid setting aside the same payment twice</strong>
              <p>
                Your budget already subtracts this card’s{" "}
                {money(getCreditCardBalanceOwed(card!))} debt. Putting payment
                money in an envelope subtracts that money again. Use this option
                only to connect an envelope you already use; otherwise, choose
                “Just track my payoff.”
              </p>
            </div>
          ) : (
            <p className="nl-setup-help">
              Add available money to this envelope between payments. After
              paying your lender, categorize the outgoing payment here and
              update your balances.
            </p>
          )}
        </div>
      )}
      <p className="nl-debt-payment-progress">
        Money in an envelope is not debt paid off. Progress changes when you
        update the amount you owe.
      </p>
    </section>
  );
}
