"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { bufferMovePreview } from "@/lib/guided-goals";
import { cents, money, ordinaryEnvelopes } from "@/lib/new-look";
import type { DashboardSummary } from "@/lib/types";
import { budgetRequest, useBudget } from "./budget-context";
import { SetupDialog } from "./setup-dialog";
import { EnvelopeActivity } from "./envelope-activity";

export function GuidedBuffer({ canEdit }: { canEdit: boolean }) {
  const { data, refresh } = useBudget();
  const [direction, setDirection] = useState<"add" | "release" | null>(null);
  const [activity, setActivity] = useState(false);
  const [receipt, setReceipt] = useState<{
    direction: "add" | "release";
    amount: number;
  } | null>(null);
  if (!data) return null;
  const buffer = data.categories.find((c) => c.is_buffer);
  const balance = buffer?.current_balance ?? data.summary.buffer_balance;
  const monthly =
    ordinaryEnvelopes(data.categories).reduce(
      (sum, c) => sum + cents(c.monthly_amount),
      0,
    ) / 100;
  const coverage = monthly > 0 ? balance / monthly : 0;
  return (
    <section className="nl-panel nl-buffer-card" id="income-buffer">
      <h2 className="nl-icon-heading">
        <ShieldCheck size={20} /> Income buffer
      </h2>
      <p className="nl-muted">Let this month’s money support a future month.</p>
      <div className="nl-buffer-balance">
        <strong>{money(balance)}</strong>
        <span>reserved for later</span>
      </div>
      <div
        className="nl-goal-progress"
        role="progressbar"
        aria-label="One month of buffer coverage"
        aria-valuenow={Math.round(Math.min(100, Math.max(0, coverage * 100)))}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span
          style={{ width: `${Math.min(100, Math.max(0, coverage * 100))}%` }}
        />
      </div>
      <p>
        {monthly > 0 ? (
          <>
            <strong>{coverage.toFixed(1)} months</strong> of your{" "}
            {money(monthly)} monthly funding plan.
          </>
        ) : (
          <>
            Set monthly envelope targets to estimate coverage.{" "}
            <Link href="/new/plan">Review your plan →</Link>
          </>
        )}
      </p>
      <p className="nl-setup-help">
        {monthly > 0 && balance < monthly
          ? `${money(monthly - balance)} more would cover one planned month. `
          : ""}
        Coverage is based on active envelope targets, not a forecast of every
        future expense.
      </p>
      <dl className="nl-metrics">
        <div>
          <dt>Available to save now</dt>
          <dd>{money(data.summary.current_savings)}</dd>
        </div>
      </dl>
      {!buffer && (
        <p role="alert" className="nl-error">
          Your buffer envelope could not be found. Review Income Buffer in
          settings before moving money.
        </p>
      )}
      <div className="nl-buffer-actions">
        <button
          className="nl-primary"
          disabled={!canEdit || !buffer || data.summary.current_savings <= 0}
          onClick={() => setDirection("add")}
        >
          Add to buffer
        </button>
        <button
          className="nl-secondary"
          disabled={!canEdit || !buffer || balance <= 0}
          onClick={() => setDirection("release")}
        >
          Release money
        </button>
      </div>
      <p className="nl-setup-help">
        Adding reserves available money. Releasing returns it to available to
        save, ready to allocate. Neither changes a bank balance.
      </p>
      {receipt && (
        <div className="nl-buffer-receipt" role="status">
          <strong>
            {money(receipt.amount)}{" "}
            {receipt.direction === "add" ? "reserved." : "released."}
          </strong>
          <p>
            {receipt.direction === "add"
              ? "Your future month has a little more breathing room."
              : "It is now available to save. Choose which envelopes to fund next."}
          </p>
          {receipt.direction === "release" && (
            <Link className="nl-secondary" href="/new/payday">
              Allocate to envelopes →
            </Link>
          )}
        </div>
      )}
      {buffer && (
        <details
          className="nl-setup-details"
          onToggle={(e) => setActivity(e.currentTarget.open)}
        >
          <summary>Buffer activity</summary>
          {activity && (
            <EnvelopeActivity
              categoryId={buffer.id}
              currentBalance={balance}
              funded={
                data.funding.categories.find((f) => f.categoryId === buffer.id)
                  ?.fundedAmount ?? 0
              }
              spent={data.spending[buffer.id] ?? 0}
            />
          )}
        </details>
      )}
      {direction && (
        <BufferMove
          key={direction}
          direction={direction}
          balance={balance}
          available={data.summary.current_savings}
          canEdit={canEdit}
          onClose={() => setDirection(null)}
          onSaved={async (amount) => {
            setReceipt({ direction, amount });
            toast.success(
              direction === "add"
                ? "Money added to your buffer."
                : "Buffer money is available to allocate.",
            );
            await refresh().catch(() =>
              toast.error(
                "Saved, but refresh failed. Reload before moving more money.",
              ),
            );
          }}
        />
      )}
    </section>
  );
}

function BufferMove({
  direction,
  balance,
  available,
  canEdit,
  onClose,
  onSaved,
}: {
  direction: "add" | "release";
  balance: number;
  available: number;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (amount: number) => Promise<void>;
}) {
  const { refresh } = useBudget();
  const [amount, setAmount] = useState("");
  const [uncertain, setUncertain] = useState(false);
  let preview: ReturnType<typeof bufferMovePreview> | null = null;
  let validation = "";
  try {
    preview = bufferMovePreview(direction, amount, balance, available);
  } catch (err) {
    if (amount) validation = (err as Error).message;
  }
  return (
    <SetupDialog
      title={
        direction === "add"
          ? "Reserve money for later"
          : "Make buffer money available"
      }
      description={
        direction === "add"
          ? "Use money already reflected in your recorded balances."
          : "Release only what you need. You’ll choose how to allocate it afterward."
      }
      dirty={amount !== ""}
      canEdit={canEdit && !uncertain}
      saveLabel={
        direction === "add" ? "Add to buffer" : "Release to available to save"
      }
      onClose={onClose}
      onSave={async () => {
        const next = bufferMovePreview(direction, amount, balance, available);
        const fresh = await budgetRequest<DashboardSummary>("/api/dashboard");
        if (
          cents(fresh.buffer_balance) !== cents(balance) ||
          cents(fresh.current_savings) !== cents(available)
        ) {
          await refresh();
          throw new Error(
            "Your balances changed. Review the updated preview before saving.",
          );
        }
        try {
          await budgetRequest(
            `/api/income-buffer/${direction === "add" ? "add" : "fund-month"}`,
            { amount: next.amount, expectedBalance: balance },
          );
        } catch (err) {
          // A lost response can hide a completed write. Never silently retry it.
          setUncertain(true);
          void refresh().catch(() => {});
          throw new Error(
            `${err instanceof Error ? err.message : "Could not confirm this change."} Close this dialog and review buffer activity before trying again.`,
          );
        }
        await onSaved(next.amount);
      }}
    >
      <label>
        Amount
        <input
          autoFocus
          required
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
      </label>
      <p className="nl-setup-help">
        Up to {money(Math.max(0, direction === "add" ? available : balance))}{" "}
        {direction === "add" ? "available to reserve" : "in your buffer"}.
      </p>
      {validation && (
        <p className="nl-error" role="status">
          {validation}
        </p>
      )}
      <div className="nl-setup-preview">
        <span>Buffer after this change</span>
        <strong>{money(preview?.balance ?? balance)}</strong>
        <span>Available to save afterward</span>
        <strong>{money(preview?.available ?? available)}</strong>
        <small>
          {direction === "add"
            ? "Your envelope balances and bank balances stay unchanged."
            : "This step does not fund envelopes. After releasing, use Allocate to envelopes to give the money a job."}
        </small>
      </div>
    </SetupDialog>
  );
}
