"use client";
import { useEffect, useState } from "react";
import { useFeatures } from "@/contexts/FeatureContext";
import type { WorthReport, WorthSummary } from "@/lib/net-worth-report";
import { useBudget } from "./budget-context";

export function useNetWorth<T extends WorthSummary = WorthReport>(
  details = false,
) {
  const features = useFeatures();
  const { data: budget, today } = useBudget();
  const accountId = budget?.identity.activeAccountId;
  const enabled =
    features.hasPremium && features.isFeatureEnabled("retirement_planning");
  const [result, setResult] = useState<{ accountId: number; data: T } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled || !accountId) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setResult(null);
    fetch(`/api/net-worth/summary${details ? "?details=true" : ""}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error || "Net worth could not load.");
        if (
          !body.current ||
          (details &&
            (!Array.isArray(body.items) || !Array.isArray(body.snapshots)))
        )
          throw new Error("Net worth data could not be read.");
        if (!controller.signal.aborted) setResult({ accountId, data: body });
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err.message || "Net worth could not load.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [enabled, accountId, today, attempt, details]);
  return {
    data:
      enabled && result && result.accountId === accountId ? result.data : null,
    loading,
    error,
    enabled,
    features,
    retry: () => setAttempt((a) => a + 1),
  };
}
