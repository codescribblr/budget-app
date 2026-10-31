"use client";
import { useBudget } from "./budget-context";
export function BudgetFreshness() {
  const { refreshing, error, lastUpdated, online, refresh } = useBudget();
  return <div className="nl-freshness" role="status">
    <span>{!online ? "Offline · showing saved balances" : error ? "Balances need a refresh" : refreshing ? "Updating balances…" : lastUpdated ? `Balances checked at ${new Date(lastUpdated).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Loading balances…"}</span>
    <button className="nl-text-button" disabled={refreshing || !online} onClick={() => void refresh().catch(() => {})}>Refresh</button>
  </div>;
}
