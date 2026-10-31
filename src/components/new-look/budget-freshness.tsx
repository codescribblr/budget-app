"use client";
import { useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { viewFreshness } from "@/lib/view-freshness";
import { resourceRefresh } from "@/lib/resource-refresh";
import { useBudget } from "./budget-context";
export function BudgetFreshness() {
  const { refreshing, error, lastUpdated, online, refresh } = useBudget();
  const path = usePathname(),
    params = useSearchParams().toString();
  useSyncExternalStore(
    viewFreshness.subscribe,
    viewFreshness.snapshot,
    () => 0,
  );
  const status = viewFreshness.status(path + (params ? `?${params}` : ""));
  const busy = refreshing || status.pending;
  // Durable resource tokens confirm unchanged views without re-fetching every
  // report. The coordinator's successful check is the relevant timestamp;
  // an old, still-valid individual GET must not pin it to the initial load.
  const checked = lastUpdated;
  return (
    <div className="nl-freshness" role="status">
      <span>
        {!online
          ? "Offline · showing previously loaded data"
          : error || status.failed
            ? "Some data could not refresh · last loaded values are shown"
            : busy
              ? "Checking for updates…"
              : checked
                ? `Updates checked at ${new Date(checked).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                : "Loading your view…"}
      </span>
      <button
        className="nl-text-button"
        disabled={busy || !online}
        onClick={() => {
          resourceRefresh.invalidate();
          void refresh().catch(() => {});
        }}
      >
        Refresh
      </button>
    </div>
  );
}
