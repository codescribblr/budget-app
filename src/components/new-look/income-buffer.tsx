"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cents, money, ordinaryEnvelopes } from "@/lib/new-look";
import { useBudget } from "./budget-context";
import { BufferMove } from "./buffer-move";
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
          Use buffer money
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
