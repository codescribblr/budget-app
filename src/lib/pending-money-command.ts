// Store only an opaque operation reference, never balances or financial payloads.
export type PendingMoneyCommand = { operationId: string; path: string };
const prefix = "budget-pending-command:";
export function pendingMoneyCommand(scope: string): PendingMoneyCommand | null {
  try {
    return JSON.parse(sessionStorage.getItem(prefix + scope) || "null");
  } catch {
    return null;
  }
}
export function recordMoneyCommand(
  scope: string,
  value: PendingMoneyCommand | null,
) {
  if (value) sessionStorage.setItem(prefix + scope, JSON.stringify(value));
  else sessionStorage.removeItem(prefix + scope);
  window.dispatchEvent(new Event("budget-money-command"));
}
