"use client";
import { useBudget } from "./budget-context";
import {
  pendingMoneyCommand,
  recordMoneyCommand,
} from "@/lib/pending-money-command";
import { useRef, useState } from "react";
import { budgetRequest, BudgetRequestError } from "@/lib/budget-request";

/** An uncertain request is retried only explicitly, with the identical operation
 * ID and payload. A committed command returns its receipt without moving again. */
export function useMoneyCommand(budgetId: number | undefined) {
  const { data } = useBudget();
  const scope = `${data?.userId}:${budgetId}`;
  const pending = useRef<{
    url: string;
    method: string;
    body: Record<string, unknown>;
  } | null>(null);
  const busy = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  async function run<T>(
    url: string,
    body: Record<string, unknown>,
    method = "POST",
  ): Promise<T> {
    if (!budgetId || busy.current)
      throw new Error("Wait for the current change to finish.");
    if (!pending.current && pendingMoneyCommand(scope))
      throw new Error(
        "A previous money change needs to be checked. Reload this page to check its outcome before saving again.",
      );
    const command = pending.current ?? {
      url,
      method,
      body: {
        ...body,
        expectedBudgetId: budgetId,
        operationId: crypto.randomUUID(),
      },
    };
    if (command.body.expectedBudgetId !== budgetId)
      throw new Error("The active budget changed. Reload before saving.");
    recordMoneyCommand(scope, {
      operationId: command.body.operationId as string,
      path: location.pathname,
    });
    pending.current = command;
    busy.current = true;
    try {
      const result = await budgetRequest<T>(
        command.url,
        command.body,
        command.method,
      );
      if (!result || typeof result !== "object") throw new Error("The save response could not be read. Check this operation’s outcome before continuing.");
      pending.current = null;
      recordMoneyCommand(scope, null);
      setUncertain(false);
      return result;
    } catch (error) {
      const rejected =
        error instanceof BudgetRequestError &&
        error.status >= 400 &&
        error.status < 500;
      if (rejected) {
        pending.current = null;
        recordMoneyCommand(scope, null);
        setUncertain(false);
      } else setUncertain(true);
      throw error;
    } finally {
      busy.current = false;
    }
  }
  return { run, uncertain };
}
