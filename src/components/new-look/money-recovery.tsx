"use client";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useBudget, budgetRequest } from "./budget-context";
import {
  pendingMoneyCommand,
  recordMoneyCommand,
  type PendingMoneyCommand,
} from "@/lib/pending-money-command";
export function MoneyRecovery() {
  const pathname = usePathname();
  const { data, online } = useBudget();
  const scope = data ? `${data.userId}:${data.identity.activeAccountId}` : "";
  const [pending, setPending] = useState<PendingMoneyCommand | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  // Read only on mount/scope change. A live editor handles its own retry; this is
  // for an abandoned request after navigation/reload.
  useEffect(() => {
    setPending(scope ? pendingMoneyCommand(scope) : null);
  }, [scope, pathname]);
  useEffect(() => {
    if (!scope) return;
    const key = `budget-save-outcome:${scope}`;
    try {
      const outcome = sessionStorage.getItem(key);
      sessionStorage.removeItem(key);
      if (outcome === "committed")
        toast.success(
          "Your previous money change was saved. The latest balances are shown.",
        );
      if (outcome === "canceled")
        toast.info(
          "Your previous money change was not applied. You can safely start again.",
        );
    } catch {
      /* Storage may be unavailable. */
    }
  }, [scope]);
  if (!pending || !data) return null;
  async function resolve() {
    setBusy(true);
    setError("");
    try {
      const result = await budgetRequest<{ status: string }>(
        "/api/new/operations",
        {
          expectedBudgetId: data!.identity.activeAccountId,
          operationId: pending!.operationId,
        },
      );
      recordMoneyCommand(scope, null);
      try {
        sessionStorage.setItem(`budget-save-outcome:${scope}`, result.status);
      } catch {}
      window.location.reload();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to check the previous save.",
      );
      setBusy(false);
    }
  }
  return (
    <div className="nl-notice" role="alert">
      <strong>Check your previous money change</strong>
      <p>
        A previous save did not receive a confirmed response. Check whether it
        was recorded before making another money change. This reloads the page
        with the latest balances.
      </p>
      {error && <p>{error}</p>}
      <button
        className="nl-secondary"
        disabled={busy || !online}
        onClick={() => void resolve()}
      >
        {busy ? "Checking…" : "Check outcome and reload"}
      </button>
    </div>
  );
}
