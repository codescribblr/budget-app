"use client";
import { useEffect, useState } from "react";
import { freshFetch } from "@/lib/view-freshness";
import type { ResourceFamily } from "@/lib/resource-refresh";
import { useBudget } from "./budget-context";
import { useResourceVersion } from "./use-resource-version";

/** Keep the last usable result on refresh, but never expose a different scope. */
export function useBudgetResource<T>(url: string, families: ResourceFamily[]) {
  const { data: budget } = useBudget();
  const version = useResourceVersion(...families);
  const key = `${budget?.userId}:${budget?.identity.activeAccountId}:${url}`;
  const [result, setResult] = useState<{ key: string; value: T } | null>(null);
  const [failure, setFailure] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!budget) return;
    const controller = new AbortController();
    setLoading(true);
    setFailure(null);
    freshFetch(url, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "This information couldn’t be loaded. Please try again.",
          );
        const value = (await response.json()) as T;
        if (!controller.signal.aborted) setResult({ key, value });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setFailure({ key, message: error.message });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [key, url, version, attempt, !!budget]);
  return {
    data: result?.key === key ? result.value : null,
    error: failure?.key === key ? failure.message : null,
    loading,
    retry: () => setAttempt((n) => n + 1),
  };
}
