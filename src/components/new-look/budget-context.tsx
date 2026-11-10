"use client";
import { registerUnsavedChanges } from '@/lib/deployment/unsaved-changes';
import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createRefreshQueue } from "@/lib/refresh-queue";
import { PageSkeleton } from "./page-skeleton";
import { viewFreshness } from "@/lib/view-freshness";
import { resourceRefresh } from "@/lib/resource-refresh";
import { BudgetRequestError } from "@/lib/budget-request";
import type {
  Account,
  Category,
  CreditCard,
  DashboardSummary,
} from "@/lib/types";
import { localDate, type Cadence, type Funding } from "@/lib/new-look";
import { useBudgetLive } from "./use-budget-live";
import { useCheckinProgress } from "./checkin-progress";
import { checkinWindow } from "@/lib/checkins";
import { watchCheckinDay } from "@/lib/checkin-calendar";
import { useFeatures } from "@/contexts/FeatureContext";

import { budgetRequest } from "@/lib/budget-request";
export { budgetRequest } from "@/lib/budget-request";
interface Identity {
  activeAccountId: number;
  accounts: { accountId: number; accountName: string; role: string }[];
}
export interface BudgetData {
  resourceTokens?: Record<string, string>;
  accounts: Account[];
  cards: CreditCard[];
  categories: Category[];
  summary: DashboardSummary;
  funding: { categories: Funding[] };
  spending: Record<number, number>;
  identity: Identity;
  userId: string;
}
interface Context {
  today: string;
  data: BudgetData | null;
  error: string | null;
  refreshing: boolean;
  refresh: () => Promise<void>;
  canEdit: boolean;
  lastUpdated: number | null;
  refreshVersion: number;
  online: boolean;
}
const BudgetContext = createContext<Context | null>(null);
export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [today, setToday] = useState(() => localDate());
  useEffect(() => watchCheckinDay(setToday), []);
  const [data, setData] = useState<BudgetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);
  const dataRef = useRef<BudgetData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [online, setOnline] = useState(true);
  const pathname = usePathname();
  const queue = useRef<ReturnType<typeof createRefreshQueue> | null>(null);
  if (!queue.current)
    queue.current = createRefreshQueue(async () => {
      const id = ++requestId.current;
      setRefreshing(true);
      try {
        const scope = dataRef.current;
        const params = new URLSearchParams({ month: localDate().slice(0, 7) });
        if (scope)
          params.set("budgetId", String(scope.identity.activeAccountId));
        const next = await budgetRequest<BudgetData>(
          `/api/new/budget-snapshot?${params}`,
        );
        if (
          !next?.identity?.activeAccountId ||
          !next.userId ||
          !next.summary ||
          !Array.isArray(next.accounts) ||
          !Array.isArray(next.cards) ||
          !Array.isArray(next.categories)
        )
          throw new Error(
            "Your budget response could not be read. Please retry.",
          );
        if (scope && scope.userId !== next.userId)
          throw new BudgetRequestError(
            "Your signed-in account changed. Reload to continue.",
            401,
          );
        if (id !== requestId.current) return;
        resourceRefresh.setScope(
          `${next.userId}:${next.identity.activeAccountId}`,
        );
        resourceRefresh.reconcile(next.resourceTokens ?? {});
        dataRef.current = next;
        setData(next);
        setError(null);
        setLastUpdated(Date.now());
        setRefreshVersion((value) => value + 1);
      } catch (err) {
        if (id === requestId.current) {
          if (
            err instanceof BudgetRequestError &&
            ([401, 403].includes(err.status) || err.code === "BUDGET_CHANGED")
          ) {
            viewFreshness.clear();
            resourceRefresh.setScope("");
            dataRef.current = null;
            setData(null);
            setLastUpdated(null);
          }
          setError(
            err instanceof Error ? err.message : "Unable to load your budget.",
          );
        }
        throw err;
      } finally {
        if (id === requestId.current) setRefreshing(false);
      }
    });
  const refresh = useCallback(() => queue.current!(), []);
  useEffect(() => {
    void refresh().catch(() => {});
  }, [refresh, pathname, today]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setOnline(navigator.onLine);
      if (document.visibilityState !== "hidden" && navigator.onLine) {
        clearTimeout(timer);
        timer = setTimeout(() => {
          resourceRefresh.invalidate();
          void refresh().catch(() => {});
        }, 150);
      }
    };
    const mutation = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh().catch(() => {}), 150);
    };
    const offline = () => setOnline(false);
    let disposed = false;
    let failures = 0;
    let poll: ReturnType<typeof setTimeout>;
    const reconcile = async () => {
      if (document.visibilityState !== "hidden" && navigator.onLine) {
        try {
          await refresh();
          failures = 0;
        } catch {
          failures++;
        }
      }
      if (!disposed)
        poll = setTimeout(
          reconcile,
          Math.min(900_000, 60_000 * 2 ** Math.min(failures, 4)) +
            Math.random() * 10_000,
        );
    };
    poll = setTimeout(reconcile, 60_000 + Math.random() * 10_000);
    window.addEventListener("budget-mutated", mutation);
    window.addEventListener("focus", wake);
    window.addEventListener("online", wake);
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", wake);
    const { data: authListener } = createClient().auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT") {
          ++requestId.current;
          viewFreshness.clear();
          resourceRefresh.setScope("");
          dataRef.current = null;
          setData(null);
          setLastUpdated(null);
          setError("Your session ended. Sign in again.");
        }
      },
    );
    setOnline(navigator.onLine);
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearTimeout(poll);
      ++requestId.current;
      window.removeEventListener("budget-mutated", mutation);
      window.removeEventListener("focus", wake);
      window.removeEventListener("online", wake);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", wake);
      authListener.subscription.unsubscribe();
    };
  }, [refresh]);
  useBudgetLive(data?.identity.activeAccountId, data?.userId, refresh);
  const role = data?.identity.accounts.find(
    (a) => a.accountId === data.identity.activeAccountId,
  )?.role;
  return (
    <BudgetContext.Provider
      value={{
        today,
        data,
        error,
        refreshing,
        refresh,
        lastUpdated,
        refreshVersion,
        online,
        canEdit: !error && online && (role === "owner" || role === "editor"),
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
}
export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) throw new Error("BudgetProvider is required");
  return context;
}
export function BudgetScope({ children }: { children: React.ReactNode }) {
  const { data, error } = useBudget();
  if (!data) return <DataBoundary>{null}</DataBoundary>;
  return (
    <Fragment
      key={data ? `${data.userId}:${data.identity.activeAccountId}` : "loading"}
    >
      {children}
    </Fragment>
  );
}

export function DataBoundary({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { data, error, refresh } = useBudget();
  const failure = error ? (
    <div className="nl-panel" role="alert">
      <h2>Your budget could not be refreshed</h2>
      <p>{error} Editing is paused until the latest balances can be loaded.</p>
      <button
        className="nl-primary"
        onClick={() => void refresh().catch(() => {})}
      >
        Try again
      </button>
    </div>
  ) : null;
  if (error && !data) return failure;
  if (!data) return fallback ?? <PageSkeleton />;
  return (
    <>
      {failure}
      {children}
    </>
  );
}

export function useCheckins(cadence: Cadence) {
  const { data, today } = useBudget();
  const period = checkinWindow(cadence, new Date(`${today}T12:00:00`));
  const {
    hasPremium,
    isFeatureEnabled,
    loading,
    error: featureError,
  } = useFeatures();
  const planning =
    hasPremium &&
    (isFeatureEnabled("goals") || isFeatureEnabled("income_buffer"));
  const progress = useCheckinProgress(
    data && !(cadence === "monthly" && (loading || featureError))
      ? {
          userId: data.userId,
          accountId: data.identity.activeAccountId,
          cadence,
          period: period.key,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          planning,
        }
      : null,
  );
  return { ...progress, period };
}

export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unregister = registerUnsavedChanges();
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        link &&
        link.origin === location.origin &&
        link.href !== location.href &&
        !window.confirm("Leave this page and discard your unsaved edits?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      unregister();
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
}
