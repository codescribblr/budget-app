"use client";
import { useEffect, useSyncExternalStore } from "react";
import { createCheckinStore, emptyCheckinSnapshot } from "@/lib/checkin-store";
import {
  checkinScopeKey,
  legacyCheckinItems,
  type CheckinScope,
} from "@/lib/checkin-persistence";
import type { CheckinTask } from "@/lib/checkins";

const store = createCheckinStore(
  async (scope, change) => {
    const { accountId, cadence, period, timeZone, planning } = scope;
    const response = await fetch(
      change
        ? "/api/checkins"
        : `/api/checkins?${new URLSearchParams({ accountId: String(accountId), cadence, period, timeZone })}`,
      change
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accountId,
              cadence,
              period,
              timeZone,
              planning,
              ...change,
            }),
          }
        : { cache: "no-store" },
    );
    const record = await response.json();
    if (!response.ok)
      throw new Error(record.error || "Unable to load check-in progress");
    if (change) {
      // Other tabs re-read the authoritative record; this is only a wake-up signal.
      try {
        localStorage.setItem(
          "budget-checkin:updated",
          `${checkinScopeKey(scope)}:${Date.now()}`,
        );
      } catch {}
    }
    return record;
  },
  (scope) => {
    try {
      return legacyCheckinItems(scope, (key) => localStorage.getItem(key));
    } catch {
      return {};
    }
  },
);

export function useCheckinProgress(scope: CheckinScope | null) {
  const key = scope ? checkinScopeKey(scope) : null;
  const snapshot = useSyncExternalStore(
    store.subscribe,
    () => (scope ? store.snapshot(scope) : emptyCheckinSnapshot),
    () => emptyCheckinSnapshot,
  );
  useEffect(() => {
    if (!scope) return;
    const reload = () => {
      if (document.visibilityState !== "hidden")
        void store.load(scope, true).catch(() => {});
    };
    const storage = (event: StorageEvent) => {
      if (event.key === "budget-checkin:updated") reload();
    };
    void store.load(scope).catch(() => {});
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", reload);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("focus", reload);
      document.removeEventListener("visibilitychange", reload);
      window.removeEventListener("storage", storage);
    };
    // The scope is a value object; period, identity and feature state drive reloads.
  }, [key, scope?.timeZone, scope?.planning]);
  return {
    ...snapshot,
    mark: (task: CheckinTask) =>
      scope
        ? store.mark(scope, task)
        : Promise.reject(new Error("Check-in is not ready")),
    retry: async () => {
      if (scope) await store.load(scope, true).catch(() => {});
    },
  };
}
