"use client";
import { useMoneyCommand } from "./use-money-command";
import { useState } from "react";
import { bufferMovePreview } from "@/lib/guided-goals";
import { money } from "@/lib/new-look";
import { moneyCommandErrorMessage } from "@/lib/money-command-errors";
import { useBudget } from "./budget-context";
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
  const { refresh, data } = useBudget();
  const command = useMoneyCommand(data?.identity.activeAccountId);
  const [amount, setAmount] = useState("");
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
      canEdit={canEdit}
      saveLabel={
        command.uncertain
          ? "Check change outcome"
          : direction === "add"
            ? "Add to buffer"
            : "Use buffer money"
      }
      onClose={onClose}
      onSave={async () => {
        // A successful write may already be reflected by live refresh after a
        // lost response. Check the original command without validating its
        // amount against the now-lower source balance a second time.
        const next = command.uncertain
          ? null
          : bufferMovePreview(direction, amount, balance, available);
        type Receipt = { amountAdded?: number; amountWithdrawn?: number };
        let result: Receipt;
        try {
          result = command.uncertain
            ? await command.retry<Receipt>()
            : await command.run<Receipt>(
                `/api/income-buffer/${direction === "add" ? "add" : "fund-month"}`,
                {
                  amount: next!.amount,
                  expectedBalance: balance,
                  expectedAvailable: available,
                },
              );
        } catch (err) {
          // A lost response can hide a completed write. Never silently retry it.
          void refresh().catch(() => {});
          throw new Error(moneyCommandErrorMessage(err));
        }
        await onSaved(
          (direction === "add" ? result.amountAdded : result.amountWithdrawn)!,
        );
      }}
    >
      {command.uncertain && (
        <p className="nl-notice">
          Check the outcome before making another change. The same change will
          never move money twice.
        </p>
      )}
      <label>
        Amount
        <input
          autoFocus
          disabled={command.uncertain}
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
      {!command.uncertain && validation && (
        <p className="nl-error" role="status">
          {validation}
        </p>
      )}
      {!command.uncertain && (
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
      )}
    </SetupDialog>
  );
}
