"use client";
import { useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { BudgetRequestError } from "@/lib/budget-request";
import { money } from "@/lib/new-look";
import { parseLocalDate } from "@/lib/date-utils";
import {
  correctionChanges,
  correctionImpact,
  correctionPatchSchema,
  type CorrectionRecord,
  type CorrectionResult,
  type TransactionCorrection,
} from "@/lib/transaction-corrections";
import { useBudget, useUnsavedChanges } from "./budget-context";
import { useMoneyCommand } from "./use-money-command";
import { NativeSelect } from "./native-select";

const dateLabel = (value: string) =>
  parseLocalDate(value)?.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) ?? value;
const direction = (value: string) =>
  value === "income" ? "Money in" : "Money out";
const statusLabel = (value: boolean) =>
  value ? "Historical · reports only" : "Affects envelope balances";

/** Keep the evidence beside the decision, including every value in a mixed selection. */
function CurrentValues({
  id,
  label,
  values,
}: {
  id: string;
  label: string;
  values: string[];
}) {
  const groups = new Map<string, number>();
  for (const value of values) groups.set(value, (groups.get(value) ?? 0) + 1);
  return (
    <div
      id={id}
      className="nl-correction-current"
      role="group"
      aria-label={`Current ${label}`}
    >
      <span className="nl-correction-current-label">
        Current{groups.size > 1 ? " · mixed" : ""}
      </span>
      <ul tabIndex={groups.size > 4 ? 0 : undefined}>
        {[...groups].map(([value, count]) => (
          <li key={value}>
            <span>{value}</span>
            <small>
              {values.length === 1
                ? "1 transaction"
                : groups.size === 1
                  ? `All ${count}`
                  : `${count} of ${values.length}`}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TransactionCorrections({
  records,
  onClose,
  onApplied,
}: {
  records: CorrectionRecord[];
  onClose: () => void;
  onApplied: () => void;
}) {
  const { data, canEdit } = useBudget();
  const command = useMoneyCommand(data!.identity.activeAccountId);
  // Keep the reviewed version even when the list behind this dialog refreshes.
  const [originals, setOriginals] = useState(records);
  const [step, setStep] = useState<"choose" | "review" | "done">("choose");
  const [account, setAccount] = useState("");
  const [changeDate, setChangeDate] = useState(false);
  const [date, setDate] = useState("");
  const [type, setType] = useState("");
  const [historical, setHistorical] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState("");
  const [latest, setLatest] = useState<CorrectionRecord[] | null>(null);
  const [discard, setDiscard] = useState(false);
  const [notice, setNotice] = useState("");
  const [updated, setUpdated] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const patch: TransactionCorrection = {
    ...(account
      ? {
          account_id: account.startsWith("account-")
            ? Number(account.slice(8))
            : null,
          credit_card_id: account.startsWith("card-")
            ? Number(account.slice(5))
            : null,
        }
      : {}),
    ...(changeDate ? { date } : {}),
    ...(type ? { transaction_type: type as "income" | "expense" } : {}),
    ...(historical ? { is_historical: historical === "historical" } : {}),
  };
  const dirty = Object.keys(patch).length > 0 && step !== "done";
  useUnsavedChanges(dirty && !saving);
  const changed = originals.filter(
    (record) => correctionChanges(record, patch).length > 0,
  );
  const impact = correctionImpact(changed, patch, data!.categories);
  const allocationChange =
    Math.round(impact.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
  const accountName = (
    record: Pick<CorrectionRecord, "account_id" | "credit_card_id">,
  ) =>
    record.account_id
      ? (data!.accounts.find((a) => a.id === record.account_id)?.name ??
        "Bank account")
      : record.credit_card_id
        ? (data!.cards.find((c) => c.id === record.credit_card_id)?.name ??
          "Credit card")
        : "No account";
  function move(next: typeof step) {
    setStep(next);
    setError("");
    setDiscard(false);
    requestAnimationFrame(() => heading.current?.focus());
  }
  function close() {
    if (busy.current) return;
    if (dirty || command.uncertain) setDiscard(true);
    else onClose();
  }
  function review() {
    if (!correctionPatchSchema.safeParse(patch).success) {
      setError(
        changeDate && !date
          ? "Choose the date to use for these transactions."
          : "Choose at least one correction and check the date.",
      );
      return;
    }
    if (!changed.length) {
      setError(
        "These transactions already have those details. Choose a different correction or cancel.",
      );
      return;
    }
    if (changed.some((record) => !record.revision)) {
      setError("Reload the transaction list before correcting these records.");
      return;
    }
    move("review");
  }
  async function apply() {
    if (busy.current || !canEdit || latest || !changed.length) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const result = await command.run<CorrectionResult>(
        "/api/transactions/corrections",
        {
          records: changed.map((record) => ({
            id: record.id,
            revision: record.revision,
          })),
          patch,
        },
      );
      if (
        !Number.isInteger(result.updated) ||
        !Array.isArray(result.transactionIds)
      )
        throw new Error(
          "Could not read the saved result. Refresh the transaction list before making further changes.",
        );
      setUpdated(result.updated);
      move("done");
      onApplied();
    } catch (err) {
      if (
        err instanceof BudgetRequestError &&
        err.code === "STALE_RECORD" &&
        Array.isArray(err.latest)
      )
        setLatest(err.latest);
      setError(
        err instanceof Error
          ? err.message
          : "Could not confirm the corrections. Retry to safely finish the same change.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  function useLatest() {
    if (!latest) return;
    const removed = changed.filter(
      (record) => !latest.some((item) => item.id === record.id),
    ).length;
    const attemptedIds = new Set(changed.map((record) => record.id));
    setOriginals(
      originals.flatMap((record) =>
        attemptedIds.has(record.id)
          ? latest.filter((item) => item.id === record.id)
          : [record],
      ),
    );
    setNotice(
      removed
        ? `${removed} removed transaction${removed === 1 ? " was" : "s were"} left out. Review the remaining corrections below.`
        : "The preview now uses the latest saved details. Review it before applying.",
    );
    setLatest(null);
    move("review");
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        className="new-look nl-setup-dialog nl-corrections sm:max-w-2xl"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle ref={heading} tabIndex={-1}>
            {step === "done"
              ? "Corrections saved"
              : step === "review"
                ? "Review your corrections"
                : "Correct transaction details"}
          </DialogTitle>
          <DialogDescription>
            {step === "done"
              ? "Your transaction history and affected envelopes are up to date."
              : step === "review"
                ? "Check the before and after, then apply the changes together."
                : `${originals.length} selected. Choose the details to change; everything else stays as it is.`}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (step === "choose") review();
            else if (step === "review") void apply();
            else onClose();
          }}
        >
          <div className="nl-setup-scroll">
            {step !== "done" && (
              <ol className="nl-correction-steps" aria-label="Correction steps">
                <li aria-current={step === "choose" ? "step" : undefined}>
                  <span>{step === "review" ? <Check size={13} /> : "1"}</span>
                  Choose changes
                </li>
                <li aria-current={step === "review" ? "step" : undefined}>
                  <span>2</span>Review & apply
                </li>
              </ol>
            )}
            {step === "choose" ? (
              <div className="nl-correction-choose">
                <details className="nl-correction-selection">
                  <summary>
                    View {originals.length} selected transaction
                    {originals.length === 1 ? "" : "s"}
                  </summary>
                  <ul className="nl-correction-records">
                    {originals.map((record) => (
                      <li key={record.id}>
                        <div className="nl-correction-record-title">
                          <strong>{record.description}</strong>
                          <span>{money(record.total_amount)}</span>
                        </div>
                        <dl>
                          <div>
                            <dt>Account</dt>
                            <dd>{accountName(record)}</dd>
                          </div>
                          <div>
                            <dt>Date</dt>
                            <dd>{dateLabel(record.date)}</dd>
                          </div>
                          <div>
                            <dt>Direction</dt>
                            <dd>{direction(record.transaction_type)}</dd>
                          </div>
                          <div>
                            <dt>Status</dt>
                            <dd>{statusLabel(record.is_historical)}</dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                </details>
                <fieldset
                  disabled={saving || !canEdit}
                  className="nl-form nl-correction-fields"
                >
                  <div className="nl-correction-field">
                    <label htmlFor="bulk-account">Account or card</label>
                    <CurrentValues
                      id="bulk-account-current"
                      label="accounts"
                      values={originals.map(accountName)}
                    />
                    <NativeSelect
                      id="bulk-account"
                      aria-describedby="bulk-account-current"
                      className="nl-select"
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                    >
                      <option value="">Keep each transaction’s account</option>
                      <optgroup label="Bank accounts">
                        {data!.accounts.map((a) => (
                          <option key={a.id} value={`account-${a.id}`}>
                            {a.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Credit cards">
                        {data!.cards.map((c) => (
                          <option key={c.id} value={`card-${c.id}`}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                      <option value="none">No account</option>
                    </NativeSelect>
                  </div>
                  <div className="nl-correction-date">
                    <label
                      className="nl-switch-label"
                      htmlFor="bulk-change-date"
                    >
                      <span>
                        Set a new date
                        <small>
                          Use the same date for every selected transaction.
                        </small>
                      </span>
                      <Switch
                        id="bulk-change-date"
                        aria-describedby="bulk-date-current"
                        checked={changeDate}
                        onCheckedChange={setChangeDate}
                      />
                    </label>
                    <CurrentValues
                      id="bulk-date-current"
                      label="dates"
                      values={originals.map((record) => dateLabel(record.date))}
                    />
                    {changeDate && (
                      <label>
                        New transaction date
                        <input
                          className="nl-input"
                          type="date"
                          value={date}
                          min="0001-01-01"
                          max="9999-12-31"
                          onChange={(e) => setDate(e.target.value)}
                          required
                        />
                      </label>
                    )}
                  </div>
                  <div className="nl-correction-field">
                    <label htmlFor="bulk-direction">Money direction</label>
                    <CurrentValues
                      id="bulk-direction-current"
                      label="money direction"
                      values={originals.map((record) =>
                        direction(record.transaction_type),
                      )}
                    />
                    <NativeSelect
                      id="bulk-direction"
                      aria-describedby="bulk-direction-current"
                      className="nl-select"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      <option value="">
                        Keep each transaction’s direction
                      </option>
                      <option value="expense">
                        Money out · purchases & payments
                      </option>
                      <option value="income">
                        Money in · income & refunds
                      </option>
                    </NativeSelect>
                  </div>
                  <div className="nl-correction-field">
                    <label htmlFor="bulk-status">
                      Envelope balance treatment
                    </label>
                    <CurrentValues
                      id="bulk-status-current"
                      label="envelope balance treatment"
                      values={originals.map((record) =>
                        statusLabel(record.is_historical),
                      )}
                    />
                    <NativeSelect
                      id="bulk-status"
                      aria-describedby="bulk-status-current bulk-status-help"
                      className="nl-select"
                      value={historical}
                      onChange={(e) => setHistorical(e.target.value)}
                    >
                      <option value="">Keep each transaction’s status</option>
                      <option value="active">Affects envelope balances</option>
                      <option value="historical">
                        Historical · reports only
                      </option>
                    </NativeSelect>
                    <small id="bulk-status-help">
                      Historical transactions appear in reports without changing
                      money left in envelopes.
                    </small>
                  </div>
                  <p className="nl-correction-hint">
                    Amounts, envelopes and splits stay the same. You’ll review
                    any balance changes next.
                  </p>
                </fieldset>
              </div>
            ) : step === "review" ? (
              <div className="nl-correction-review">
                {notice && (
                  <p className="nl-notice" role="status">
                    {notice}
                  </p>
                )}
                <section
                  className="nl-correction-impact"
                  aria-label="Effect on your budget"
                >
                  <h3>Effect on your budget</h3>
                  {impact.length ? (
                    <dl>
                      {impact.map((item) => (
                        <div key={item.id}>
                          <dt>{item.name}</dt>
                          <dd>
                            {money(Math.abs(item.amount))}{" "}
                            {item.amount > 0 ? "more" : "less"} left
                          </dd>
                        </div>
                      ))}
                      <div>
                        <dt>Available to save</dt>
                        <dd>
                          {allocationChange === 0
                            ? "No net change"
                            : `${money(Math.abs(allocationChange))} ${allocationChange > 0 ? "less" : "more"}`}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p>
                      Envelope balances and available to save stay the same.
                    </p>
                  )}
                  <p className="nl-muted">
                    Recorded bank and card balances stay the same.
                    {patch.date &&
                      " Reports will use the new transaction date."}
                  </p>
                </section>
                <div className="nl-correction-preview-heading">
                  <h3>
                    {changed.length} transaction
                    {changed.length === 1 ? "" : "s"} to update
                  </h3>
                  {originals.length > changed.length && (
                    <span>
                      {originals.length - changed.length} already match
                    </span>
                  )}
                </div>
                {changed.length ? (
                  <ul className="nl-correction-records">
                    {originals.map((record) => {
                      const next = { ...record, ...patch };
                      const changes = correctionChanges(record, patch);
                      const lines = [
                        {
                          label: "Account",
                          before: accountName(record),
                          after: accountName(next),
                          changed: changes.some(
                            (c) =>
                              c.field === "account_id" ||
                              c.field === "credit_card_id",
                          ),
                        },
                        {
                          label: "Date",
                          before: dateLabel(record.date),
                          after: dateLabel(next.date),
                          changed: changes.some((c) => c.field === "date"),
                        },
                        {
                          label: "Direction",
                          before: direction(record.transaction_type),
                          after: direction(next.transaction_type),
                          changed: changes.some(
                            (c) => c.field === "transaction_type",
                          ),
                        },
                        {
                          label: "Status",
                          before: statusLabel(record.is_historical),
                          after: statusLabel(next.is_historical),
                          changed: changes.some(
                            (c) => c.field === "is_historical",
                          ),
                        },
                      ];
                      return (
                        <li key={record.id}>
                          <div className="nl-correction-record-title">
                            <strong>{record.description}</strong>
                            <span>{money(record.total_amount)}</span>
                          </div>
                          {!changes.length && <p>No changes needed</p>}
                          <dl>
                            {lines.map((line) => (
                              <div key={line.label}>
                                <dt>{line.label}</dt>
                                <dd>
                                  <span>{line.before}</span>
                                  {line.changed ? (
                                    <>
                                      <ArrowRight
                                        size={13}
                                        aria-label="changes to"
                                      />
                                      <strong>{line.after}</strong>
                                    </>
                                  ) : (
                                    <small className="nl-correction-kept">
                                      Kept
                                    </small>
                                  )}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="nl-notice">
                    No corrections remain. These records already match, or were
                    removed. Return to the list or choose different changes.
                  </p>
                )}
              </div>
            ) : (
              <div className="nl-correction-success" role="status">
                <CheckCircle2 size={36} />
                <h3>
                  {updated} transaction{updated === 1 ? "" : "s"} corrected
                </h3>
                <p>
                  Your changes were applied together. Transactions may leave the
                  list if they no longer match your filters.
                </p>
              </div>
            )}
          </div>
          <div className="nl-setup-footer">
            {error && (
              <p className="nl-error" role="alert">
                {error}
              </p>
            )}
            {latest && (
              <button
                type="button"
                className="nl-secondary"
                onClick={useLatest}
              >
                Review latest records
              </button>
            )}
            {!canEdit && step !== "done" && (
              <p className="nl-muted">
                Reconnect and refresh your budget to continue. Your corrections
                are kept here.
              </p>
            )}
            {discard ? (
              <div className="nl-discard-prompt" role="alert">
                <p>
                  {command.uncertain
                    ? "The save may have reached the server. Retry to confirm its outcome, or close and check it when you return."
                    : "Discard these unsaved corrections?"}
                </p>
                <div className="nl-form-actions">
                  <button
                    type="button"
                    className="nl-secondary"
                    onClick={() => setDiscard(false)}
                  >
                    {command.uncertain ? "Keep checking" : "Keep editing"}
                  </button>
                  <button
                    type="button"
                    className="nl-secondary"
                    onClick={onClose}
                  >
                    {command.uncertain ? "Close for now" : "Discard changes"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="nl-form-actions">
                {step !== "done" && (
                  <button
                    type="button"
                    className="nl-secondary"
                    disabled={saving}
                    onClick={close}
                  >
                    Cancel
                  </button>
                )}
                {step === "review" && !command.uncertain && (
                  <button
                    type="button"
                    className="nl-secondary"
                    disabled={saving || !!latest}
                    onClick={() => move("choose")}
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  className="nl-primary"
                  disabled={
                    step !== "done" &&
                    (saving ||
                      !canEdit ||
                      !!latest ||
                      (step === "choose" ? !dirty : !changed.length))
                  }
                >
                  {saving
                    ? "Applying corrections…"
                    : step === "done"
                      ? "Back to transactions"
                      : step === "choose"
                        ? "Review changes"
                        : command.uncertain
                          ? "Retry & confirm changes"
                          : `Apply to ${changed.length} transaction${changed.length === 1 ? "" : "s"}`}
                </button>
              </div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
