import { BudgetRequestError } from "./budget-request";

/** A rejected request is known not to have committed; transport/server failures
 * may have committed and must retain their operation ID for safe recovery. */
export function isMoneyCommandRejected(error: unknown) {
  return error instanceof BudgetRequestError && error.status >= 400 && error.status < 500;
}

export function moneyCommandErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Could not confirm this change.";
  return isMoneyCommandRejected(error)
    ? `${message} Nothing was changed. Your entries are kept.`
    : `${message} Your entries are kept. Check the change’s outcome before trying again.`;
}
