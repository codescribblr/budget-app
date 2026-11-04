"use client";
import { useMoneyCommand } from "./use-money-command";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useFeatures } from "@/contexts/FeatureContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  paydayFunding,
  monthlyFundingSuggestion,
  suggestedBufferContribution,
} from "@/lib/payday-funding";
import { BufferMove } from "./buffer-move";
import { SkeletonRows } from "./skeleton-sections";
import {
  cents,
  localDate,
  money,
  ordinaryEnvelopes,
  parseMoney,
  suggestAllocation,
  remainingFunding,
} from "@/lib/new-look";
import { useBudget, DataBoundary, useUnsavedChanges } from "./budget-context";
import { PageHeading, ReadOnlyNotice } from "./common";

export function GuidedPayday() {
  return (
    <DataBoundary>
      <PaydayContent />
    </DataBoundary>
  );
}
function PaydayContent() {
  const { data, canEdit, refresh, refreshing } = useBudget();
  const command = useMoneyCommand(data?.identity.activeAccountId);
  const {
    isFeatureEnabled,
    hasPremium,
    loading: featuresLoading,
    error: featureError,
    refreshFeatures,
  } = useFeatures();
  const bufferEnabled = hasPremium && isFeatureEnabled("income_buffer");
  const buffer = data?.categories.find((c) => c.is_buffer);
  const bufferBalance =
    buffer?.current_balance ?? data?.summary.buffer_balance ?? 0;
  const [useBuffer, setUseBuffer] = useState(false);
  const [bufferText, setBufferText] = useState("");
  const [coverShortfall, setCoverShortfall] = useState(false);
  const suggestionsEnabled = hasPremium && isFeatureEnabled("smart_allocation");
  const [limit, setLimit] = useState("");
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [preview, setPreview] = useState<{
    available: number;
    bufferBalance: number;
    withdrawal: number;
    total: number;
    month: string;
    allocations: { categoryId: number; name: string; amount: number }[];
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{
    amount: number;
    tracked: boolean;
    bufferWithdrawn: number;
  } | null>(null);
  const envelopes = ordinaryEnvelopes(data?.categories || []);
  const allocations = envelopes.map((c) => ({
    categoryId: c.id,
    amount: parseMoney(draft[c.id] ?? "0"),
  }));
  const total =
    allocations.reduce((sum, a) => sum + cents(a.amount || 0), 0) / 100;
  const cap = parseMoney(limit);
  const available = data?.summary.current_savings ?? 0;
  const bufferReady =
    bufferEnabled && !!buffer && !featureError && !featuresLoading;
  const monthly = monthlyFundingSuggestion(
    data?.categories ?? [],
    data?.funding.categories ?? [],
    available,
    bufferReady ? bufferBalance : 0,
    isFeatureEnabled("priority_system"),
  );
  const bufferSuggestion = suggestedBufferContribution(
    cap ?? monthly.remaining,
    available,
    bufferReady ? bufferBalance : 0,
  );
  const funding = paydayFunding({
    available,
    bufferBalance,
    bufferEnabled: bufferReady,
    useBuffer,
    bufferText,
    total,
  });
  const exceedsAvailable = cap !== null && cents(cap) > cents(funding.capacity);
  const reviewChanged =
    !!preview &&
    (cents(preview.available) !== cents(available) ||
      (preview.withdrawal > 0 &&
        (cents(preview.bufferBalance) !== cents(bufferBalance) ||
          !bufferEnabled ||
          !!featureError ||
          !buffer)));
  const invalid = allocations.some((a) => a.amount === null || a.amount < 0);
  const valid = Boolean(
    data &&
    cap !== null &&
    cap > 0 &&
    !invalid &&
    funding.canFund &&
    cents(total) <= cents(cap),
  );
  useUnsavedChanges(
    useBuffer ||
      limit !== "" ||
      Object.values(draft).some(
        (value) => value !== "" && value !== "0" && value !== "0.00",
      ),
  );
  if (!data) return null;
  function useMonthlySuggestion() {
    setLimit(monthly.amount.toFixed(2));
    setDraft(monthly.allocations);
    setUseBuffer(monthly.buffer > 0);
    setBufferText(monthly.buffer > 0 ? monthly.buffer.toFixed(2) : "");
    setReceipt(null);
  }
  async function apply() {
    if (
      ((!valid || !preview || reviewChanged) && !command.uncertain) ||
      saving ||
      !canEdit
    )
      return;
    setSaving(true);
    setError("");
    try {
      const result = await command.run<{
        fundingTracked: boolean;
        totalAmount: number;
        bufferWithdrawn?: number;
      }>("/api/allocations/batch", {
        allocations: preview?.allocations.map(({ categoryId, amount }) => ({
          categoryId,
          amount,
        })),
        month: preview?.month,
        expectedAvailable: preview?.available,
        ...(preview && preview.withdrawal > 0
          ? {
              bufferWithdrawAmount: preview.withdrawal,
              expectedBalance: preview.bufferBalance,
            }
          : {}),
      });
      setReceipt({
        amount: result.totalAmount,
        tracked: result.fundingTracked,
        bufferWithdrawn: result.bufferWithdrawn ?? 0,
      });
      setDraft({});
      setPreview(null);
      setLimit("");
      setUseBuffer(false);
      setBufferText("");
      if (result.fundingTracked) toast.success("Envelopes funded.");
      else
        toast.warning(
          "Balances updated, but monthly funding was not recorded. Do not allocate this money again.",
        );
    } catch (err) {
      setPreview(null);
      setError(
        `${err instanceof Error ? err.message : "Allocation could not be confirmed."} Your entries are retained. If the result is uncertain, check the allocation outcome before entering another allocation.`,
      );
      // Retain the draft and operation ID until the outcome is confirmed.
    } finally {
      try {
        await refresh();
      } catch {
        toast.error("Refresh failed. Reload before allocating again.");
      }
      setSaving(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="When you get paid"
        title="Give this paycheck a job"
        description="Allocate money already reflected in your account balances. Your monthly plan guides the choices; you decide what gets funded now."
      >
        <Link className="nl-secondary" href="/new/accounts">
          Update balances first →
        </Link>
      </PageHeading>
      <ReadOnlyNotice />
      {receipt && (
        <div className="nl-notice" role="status">
          <strong>{money(receipt.amount)} allocated.</strong>{" "}
          {receipt.bufferWithdrawn > 0 && (
            <>{money(receipt.bufferWithdrawn)} came from your income buffer. </>
          )}
          {receipt.tracked ? (
            "Envelope balances and this month’s funding have been updated."
          ) : (
            <>
              Monthly funding could not be recorded.{" "}
              <Link href="/new/budget">Review envelope activity</Link> before
              allocating again. Do not submit this amount again.
            </>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="nl-error">
          {error}
        </p>
      )}
      {command.uncertain && (
        <div className="nl-notice" role="status">
          <p>
            This allocation is unconfirmed. Check its status before continuing;
            checking will not allocate the money again.
          </p>
          <button
            className="nl-primary"
            disabled={saving || !canEdit}
            onClick={() => void apply()}
          >
            Check allocation outcome
          </button>
        </div>
      )}
      <fieldset
        disabled={command.uncertain || saving}
        className="nl-command-fields"
      >
        <div className="nl-two-column nl-funding-layout">
          <section className="nl-panel nl-form">
            <h2>1. Choose how much to allocate</h2>
            <div className="nl-monthly-funding-summary">
              <div className="nl-monthly-funding-total">
                <span>Still to fund this month</span>
                <strong>{money(monthly.remaining)}</strong>
              </div>
              <p>
                {monthly.remaining > 0
                  ? `${monthly.envelopeCount} ${monthly.envelopeCount === 1 ? "envelope needs" : "envelopes need"} more funding. Money already funded is accounted for.`
                  : "This month’s funding targets are covered."}
              </p>
              {monthly.remaining > 0 && (
                <>
                  <p>
                    {monthly.buffer > 0 ? (
                      <>
                        Suggested:{" "}
                        {money(
                          Math.max(0, Math.min(available, monthly.amount)),
                        )}{" "}
                        from Available to save +{" "}
                        <strong>
                          {money(monthly.buffer)} from your buffer
                        </strong>
                        .
                      </>
                    ) : available >= monthly.remaining ? (
                      "Available to save covers the remaining funding. No buffer money is needed."
                    ) : (
                      "Use your available money to fund what you can now."
                    )}
                  </p>
                  {monthly.shortfall > 0 && (
                    <p className="nl-monthly-funding-shortfall">
                      {money(monthly.shortfall)} will still need funding
                      {monthly.buffer > 0 ? " after using the full buffer" : ""}
                      .
                    </p>
                  )}
                  {(monthly.canFundAll || suggestionsEnabled) && (
                    <button
                      className="nl-secondary"
                      disabled={
                        !canEdit ||
                        saving ||
                        refreshing ||
                        (!monthly.canFundAll &&
                          (featuresLoading || !!featureError)) ||
                        available < 0 ||
                        monthly.amount <= 0
                      }
                      onClick={useMonthlySuggestion}
                    >
                      {monthly.canFundAll
                        ? "Fund all remaining"
                        : "Suggest what I can fund"}{" "}
                      · {money(monthly.amount)}
                    </button>
                  )}
                </>
              )}
            </div>
            <label>
              Amount to allocate
              <input
                inputMode="decimal"
                placeholder="0.00"
                value={limit}
                aria-describedby="payday-amount-help"
                disabled={!canEdit || saving}
                onChange={(e) => {
                  setLimit(e.target.value);
                  setReceipt(null);
                }}
              />
            </label>
            <div id="payday-amount-help" aria-live="polite">
              {exceedsAvailable ? (
                <p className="nl-notice">
                  You have {money(funding.capacity)} available for this
                  allocation.{" "}
                  {bufferEnabled && bufferBalance > 0 && available >= 0 && (
                    <>Choose a buffer contribution below, or </>
                  )}
                  <Link
                    className="underline underline-offset-2"
                    href="/new/accounts"
                  >
                    Update your account balances
                  </Link>{" "}
                  if your paycheck has arrived.
                </p>
              ) : (
                <small>
                  Up to {money(funding.capacity)} is available for this
                  allocation. Unassigned money stays where it is.
                </small>
              )}
            </div>
            {featuresLoading ? (
              <SkeletonRows
                count={1}
                kind="balances"
                label="Loading income buffer availability"
              />
            ) : (
              bufferEnabled && (
                <div className="nl-funding-buffer">
                  <div className="nl-funding-buffer-heading">
                    <span>
                      <ShieldCheck size={16} aria-hidden="true" /> Income buffer
                    </span>
                    <strong>{money(bufferBalance)}</strong>
                  </div>
                  {!buffer ? (
                    <p>
                      Your buffer couldn’t be found.{" "}
                      <Link href="/new/settings/features">
                        Review settings →
                      </Link>
                    </p>
                  ) : available < 0 ? (
                    <>
                      <p>
                        Cover the {money(-available)} shortfall in Available to
                        save before funding envelopes.
                      </p>
                      <button
                        className="nl-secondary"
                        disabled={
                          !canEdit || bufferBalance <= 0 || !!featureError
                        }
                        onClick={() => setCoverShortfall(true)}
                      >
                        Use buffer money
                      </button>
                    </>
                  ) : (
                    <>
                      <label
                        className="nl-funding-buffer-switch"
                        htmlFor="funding-use-buffer"
                      >
                        <span>Use buffer money</span>
                        <Switch
                          id="funding-use-buffer"
                          className="nl-switch"
                          checked={useBuffer}
                          disabled={
                            !canEdit ||
                            (!useBuffer &&
                              (bufferBalance <= 0 || !!featureError))
                          }
                          onCheckedChange={(checked) => {
                            setUseBuffer(checked);
                            if (checked)
                              setBufferText(bufferSuggestion.toFixed(2));
                            setReceipt(null);
                          }}
                        />
                      </label>
                      {useBuffer ? (
                        <div className="nl-form nl-funding-buffer-entry">
                          <label htmlFor="funding-buffer-amount">
                            Amount from buffer
                            <input
                              id="funding-buffer-amount"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={bufferText}
                              aria-describedby="funding-buffer-help"
                              disabled={!canEdit || !!featureError}
                              onChange={(e) => {
                                setBufferText(e.target.value);
                                setReceipt(null);
                              }}
                            />
                          </label>
                          {bufferSuggestion > 0 &&
                            parseMoney(bufferText) !== bufferSuggestion && (
                              <button
                                className="nl-secondary"
                                disabled={!canEdit || !!featureError}
                                onClick={() => {
                                  setBufferText(bufferSuggestion.toFixed(2));
                                  setReceipt(null);
                                }}
                              >
                                Use suggested · {money(bufferSuggestion)}
                              </button>
                            )}
                          <small id="funding-buffer-help">
                            Taken from your buffer when you confirm the
                            allocation.
                          </small>
                          {bufferText && funding.error && (
                            <p className="nl-error" role="status">
                              {funding.error}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p>
                          {bufferBalance <= 0
                            ? "Your buffer is empty."
                            : bufferSuggestion > 0
                              ? `Suggested: ${money(bufferSuggestion)}${cents(bufferSuggestion) < Math.max(0, cents(cap ?? monthly.remaining) - cents(available)) ? " — your full buffer" : " to cover the funding gap"}.`
                              : "No buffer money is needed for this amount."}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )
            )}
            {featureError && (
              <p className="nl-error" role="status">
                Buffer availability couldn’t be checked.{" "}
                <button
                  className="nl-text-button"
                  onClick={() => void refreshFeatures()}
                >
                  Retry
                </button>
              </p>
            )}
            {!bufferEnabled && useBuffer && (
              <p className="nl-error" role="status">
                {funding.error}{" "}
                <button
                  className="nl-text-button"
                  onClick={() => setUseBuffer(false)}
                >
                  Remove buffer contribution
                </button>
              </p>
            )}
          </section>
          <section
            className="nl-panel nl-funding-picture"
            aria-label="Your funding picture"
          >
            <p className="nl-eyebrow">Your funding picture</p>
            <dl className="nl-metrics">
              <div>
                <dt>Available to save now</dt>
                <dd>{money(available)}</dd>
              </div>
            </dl>
            <dl className="nl-metrics">
              {bufferEnabled && (
                <div>
                  <dt>Income buffer now</dt>
                  <dd>{money(bufferBalance)}</dd>
                </div>
              )}
              {useBuffer && (
                <div>
                  <dt>From buffer</dt>
                  <dd>{money(funding.withdrawal)}</dd>
                </div>
              )}
              <div>
                <dt>Going into envelopes</dt>
                <dd>{money(total)}</dd>
              </div>
              <div>
                <dt>Available to save after</dt>
                <dd className={funding.availableAfter < 0 ? "nl-negative" : ""}>
                  {money(funding.availableAfter)}
                </dd>
              </div>
              {bufferEnabled && (
                <div>
                  <dt>Buffer after</dt>
                  <dd className={funding.bufferAfter < 0 ? "nl-negative" : ""}>
                    {money(funding.bufferAfter)}
                  </dd>
                </div>
              )}
            </dl>
            <p>
              Bank balances stay the same. Money moves only when you confirm.
            </p>
          </section>
        </div>
        <div
          className="nl-section-title nl-funding-section-title"
          style={{ marginTop: 28 }}
        >
          <h2>2. Choose what to fund</h2>
          <div className="nl-funding-actions">
            {monthly.canFundAll && (
              <button
                className="nl-primary"
                disabled={!canEdit || saving || refreshing}
                onClick={useMonthlySuggestion}
              >
                Fund all remaining
              </button>
            )}
            {suggestionsEnabled && (
              <button
                className="nl-secondary"
                disabled={!canEdit || saving || cap === null || cap <= 0}
                onClick={() => {
                  setDraft(
                    suggestAllocation(
                      data.categories,
                      data.funding.categories,
                      Math.min(cap || 0, funding.capacity),
                      isFeatureEnabled("priority_system"),
                      true,
                    ),
                  );
                  setReceipt(null);
                }}
              >
                {isFeatureEnabled("priority_system")
                  ? "Suggest by priority"
                  : "Suggest within amount"}
              </button>
            )}
          </div>
        </div>
        <p className="nl-footnote">
          Remaining to fund is your planned monthly contribution minus what
          you’ve already funded this month. Reserve envelopes also stop at
          their balance target.{" "}
          {suggestionsEnabled
            ? `Suggestions follow ${isFeatureEnabled("priority_system") ? "priority, then envelope order" : "envelope order"} and stop at the amount you set. Every amount is editable.`
            : "Enter the amounts you want to fund below."}
        </p>
        <div className="nl-table-wrap">
          <table className="nl-table">
            <thead>
              <tr>
                <th>Envelope</th>
                <th className="nl-right">Monthly plan</th>
                <th className="nl-right">Already funded</th>
                <th className="nl-right">Remaining to fund</th>
                <th className="nl-right">Fund now</th>
              </tr>
            </thead>
            <tbody>
              {envelopes.map((c) => {
                const funded =
                  data.funding.categories.find((f) => f.categoryId === c.id)
                    ?.fundedAmount || 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      <span className="nl-subtext">
                        Balance: {money(c.current_balance)}
                      </span>
                    </td>
                    <td
                      data-label="Monthly plan"
                      className="nl-right nl-number"
                    >
                      {money(c.monthly_amount)}
                    </td>
                    <td
                      data-label="Already funded"
                      className="nl-right nl-number"
                    >
                      {money(funded)}
                    </td>
                    <td
                      data-label="Remaining to fund"
                      className="nl-right nl-number"
                    >
                      {money(remainingFunding(c, funded))}
                    </td>
                    <td data-label="Fund now" className="nl-right">
                      <input
                        className="nl-money-input"
                        aria-label={`Fund ${c.name}`}
                        inputMode="decimal"
                        value={draft[c.id] ?? "0.00"}
                        disabled={!canEdit || saving}
                        onChange={(e) => {
                          setDraft({ ...draft, [c.id]: e.target.value });
                          setReceipt(null);
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!envelopes.length && (
          <p className="nl-notice">
            <Link href="/new/budget/manage?edit=new">
              Add your first envelope →
            </Link>
          </p>
        )}
        <div className="nl-savebar">
          <div>
            <strong>{money(total)} ready to allocate</strong>
            <p>
              {invalid
                ? "Enter valid, nonnegative amounts with up to two decimals."
                : cap !== null && total > cap
                  ? "This is more than the amount you chose to work with."
                  : funding.error
                    ? funding.error
                    : total > funding.capacity
                      ? bufferEnabled && bufferBalance > 0
                        ? "Choose a buffer contribution or reduce the amounts to match your available money."
                        : "Reduce the amounts to match your Available to save."
                      : cap !== null
                        ? `${money(Math.max(0, cap - total))} of this amount left to assign`
                        : "Set an amount above, then choose what to fund."}
            </p>
          </div>
          <div>
            <button
              className="nl-secondary"
              disabled={saving}
              onClick={() => setDraft({})}
            >
              Clear amounts
            </button>
            <button
              className="nl-primary"
              disabled={!valid || !canEdit || saving || refreshing}
              onClick={() =>
                setPreview({
                  available,
                  bufferBalance,
                  withdrawal: funding.withdrawal,
                  total,
                  month: `${localDate().slice(0, 7)}-01`,
                  allocations: allocations
                    .filter((a) => a.amount !== null && a.amount > 0)
                    .map((a) => ({
                      categoryId: a.categoryId,
                      amount: a.amount!,
                      name: envelopes.find((c) => c.id === a.categoryId)!.name,
                    })),
                })
              }
            >
              Review allocation →
            </button>
          </div>
        </div>
      </fieldset>
      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!saving && !open) setPreview(null);
        }}
      >
        <DialogContent className="new-look">
          <DialogHeader>
            <DialogTitle>Review this allocation</DialogTitle>
            <DialogDescription>
              This increases the selected envelope balances and their funding
              for{" "}
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
              .
            </DialogDescription>
          </DialogHeader>
          <div className="nl-dialog-summary max-h-72 overflow-auto">
            {preview?.allocations.map((a) => (
              <div key={a.categoryId}>
                <span>{a.name}</span>
                <strong>{money(a.amount!)}</strong>
              </div>
            ))}
            <hr />
            <div>
              <strong>Total</strong>
              <strong>{money(preview?.total ?? 0)}</strong>
            </div>
            {(preview?.withdrawal ?? 0) > 0 && (
              <>
                <div>
                  <span>From Available to save</span>
                  <strong>
                    {money((preview?.total ?? 0) - (preview?.withdrawal ?? 0))}
                  </strong>
                </div>
                <div>
                  <span>From income buffer</span>
                  <strong>{money(preview?.withdrawal ?? 0)}</strong>
                </div>
                <div>
                  <span>Buffer after</span>
                  <strong>
                    {money(
                      (preview?.bufferBalance ?? 0) -
                        (preview?.withdrawal ?? 0),
                    )}
                  </strong>
                </div>
              </>
            )}
            <div>
              <span>Available to save after</span>
              <strong>
                {money(
                  (preview?.available ?? 0) +
                    (preview?.withdrawal ?? 0) -
                    (preview?.total ?? 0),
                )}
              </strong>
            </div>
          </div>
          {reviewChanged && (
            <p className="nl-notice" role="alert">
              Your funding sources changed while you were reviewing. Go back to
              see the latest balances; your amounts are kept.
            </p>
          )}
          <div className="nl-form-actions">
            <button
              className="nl-secondary"
              disabled={saving}
              onClick={() => setPreview(null)}
            >
              Keep editing
            </button>
            <button
              className="nl-primary"
              disabled={
                saving || !valid || !canEdit || reviewChanged || refreshing
              }
              onClick={apply}
            >
              {saving
                ? "Allocating…"
                : `Allocate ${money(preview?.total ?? 0)}`}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {coverShortfall && buffer && (
        <BufferMove
          direction="release"
          balance={bufferBalance}
          available={available}
          canEdit={canEdit && bufferEnabled && !featureError}
          onClose={() => setCoverShortfall(false)}
          onSaved={async (amount) => {
            toast.success(`${money(amount)} returned to Available to save.`);
            await refresh().catch(() =>
              toast.error(
                "Saved, but refresh failed. Refresh before allocating.",
              ),
            );
          }}
        />
      )}
    </>
  );
}
