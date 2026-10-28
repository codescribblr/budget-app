"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useFeatures } from "@/contexts/FeatureContext";
import { cents, money } from "@/lib/new-look";
import { useBudget } from "./budget-context";
import { BufferMove } from "./buffer-move";

/** Keep the two sources visible without treating reserved buffer money as available. */
export function AvailableBuffer() {
  const { data, canEdit, refresh } = useBudget();
  const { hasPremium, isFeatureEnabled, loading, error } = useFeatures();
  const [direction, setDirection] = useState<"add" | "release" | null>(null);
  const [receipt, setReceipt] = useState("");
  if (
    !data ||
    loading ||
    error ||
    !hasPremium ||
    !isFeatureEnabled("income_buffer")
  )
    return null;
  const buffer = data.categories.find((c) => c.is_buffer);
  const balance = buffer?.current_balance ?? data.summary.buffer_balance;
  const available = data.summary.current_savings;
  const canAdd = cents(available) > 0;
  const canRelease = cents(balance) > 0;
  return (
    <section
      className="nl-available-buffer"
      aria-label="Income buffer quick actions"
    >
      <div className="nl-available-buffer-balance">
        <Link href="/new/goals#income-buffer">
          <ShieldCheck size={16} aria-hidden="true" />
          Income buffer
        </Link>
        <span>
          <strong>{money(balance)}</strong> set aside
        </span>
      </div>
      {!buffer ? (
        <p>
          Your buffer couldn’t be found.{" "}
          <Link href="/new/settings/features">Review buffer settings →</Link>
        </p>
      ) : (
        <>
          {(canAdd || canRelease) && (
            <div className="nl-available-buffer-actions">
              {canAdd && (
                <button
                  className="nl-secondary"
                  disabled={!canEdit}
                  onClick={() => {
                    setReceipt("");
                    setDirection("add");
                  }}
                >
                  <ArrowUpRight size={15} aria-hidden="true" />
                  Add to buffer
                </button>
              )}
              {canRelease && (
                <button
                  className="nl-secondary"
                  disabled={!canEdit}
                  onClick={() => {
                    setReceipt("");
                    setDirection("release");
                  }}
                >
                  <ArrowDownLeft size={15} aria-hidden="true" />
                  Use buffer money
                </button>
              )}
            </div>
          )}
          {!canAdd && !canRelease && (
            <p>Set money aside here when Available to save is positive.</p>
          )}
          <p className="nl-available-buffer-help">
            Adding sets money aside. Using it returns money to Available to
            save.
          </p>
        </>
      )}
      {receipt && (
        <p className="nl-available-buffer-receipt" role="status">
          {receipt}
        </p>
      )}
      {direction && buffer && (
        <BufferMove
          key={`${data.identity.activeAccountId}:${direction}`}
          direction={direction}
          balance={balance}
          available={available}
          canEdit={canEdit}
          onClose={() => setDirection(null)}
          onSaved={async (amount) => {
            const message =
              direction === "add"
                ? `${money(amount)} added to your buffer.`
                : `${money(amount)} returned to Available to save.`;
            setReceipt(message);
            toast.success(message);
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
