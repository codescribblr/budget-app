"use client";
import { useState } from "react";
import { bufferMovePreview } from "@/lib/guided-goals";
import { cents, money } from "@/lib/new-look";
import type { DashboardSummary } from "@/lib/types";
import { budgetRequest, useBudget } from "./budget-context";
import { SetupDialog } from "./setup-dialog";

export function BufferMove({
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
        direction === "add" ? "Add to your income buffer" : "Use buffer money"
      }
      description={
        direction === "add"
          ? "Set aside money from Available to save for a future month. Your bank balances stay the same."
          : "Return money to Available to save. You can fund envelopes afterward; your bank balances stay the same."
      }
      dirty={amount !== ""}
      canEdit={canEdit && !uncertain}
      saveLabel={direction === "add" ? "Add to buffer" : "Use buffer money"}
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
            ? "Other envelope balances and bank balances stay unchanged."
            : "The money returns to Available to save. You can choose which envelopes to fund next."}
        </small>
      </div>
    </SetupDialog>
  );
}
