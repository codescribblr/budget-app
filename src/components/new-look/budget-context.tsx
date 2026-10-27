"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  Account,
  Category,
  CreditCard,
  DashboardSummary,
} from "@/lib/types";
import { localDate, type Cadence, type Funding } from "@/lib/new-look";
import { useCheckinProgress } from "./checkin-progress";
import { checkinWindow } from "@/lib/checkins";
import { watchCheckinDay } from "@/lib/checkin-calendar";
import { useFeatures } from "@/contexts/FeatureContext";

export async function budgetRequest<T>(
  url: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const response = await fetch(
    url,
    body === undefined
      ? { cache: "no-store" }
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      data?.error || `Request failed (${response.status}). Please try again.`,
    );
  return data as T;
}
interface Identity {
  activeAccountId: number;
  accounts: { accountId: number; accountName: string; role: string }[];
}
export interface BudgetData {
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
}
const BudgetContext = createContext<Context | null>(null);
export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [today, setToday] = useState(() => localDate());
  useEffect(() => watchCheckinDay(setToday), []);
  const [data, setData] = useState<BudgetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);
  const pathname = usePathname();
  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    setRefreshing(true);
    try {
      const month = localDate().slice(0, 7);
      const [
        accounts,
        cards,
        categories,
        summary,
        funding,
        spending,
        identity,
        auth,
      ] = await Promise.all([
        budgetRequest<Account[]>("/api/accounts"),
        budgetRequest<CreditCard[]>("/api/credit-cards"),
        budgetRequest<Category[]>("/api/categories"),
        budgetRequest<DashboardSummary>("/api/dashboard"),
        budgetRequest<{ categories: Funding[] }>(
          `/api/monthly-funding/${month}-01`,
        ),
        budgetRequest<Record<number, number>>(
          `/api/categories/monthly-spending?month=${month}`,
        ),
        budgetRequest<Identity>("/api/budget-accounts"),
        createClient().auth.getUser(),
      ]);
      if (!auth.data.user)
        throw new Error("Your session has expired. Sign in again.");
      if (id === requestId.current) {
        setData({
          accounts,
          cards,
          categories,
          summary,
          funding,
          spending,
          identity,
          userId: auth.data.user.id,
        });
        setError(null);
      }
    } catch (err) {
      if (id === requestId.current)
        setError(
          err instanceof Error ? err.message : "Unable to load your budget.",
        );
      throw err;
    } finally {
      if (id === requestId.current) setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    void refresh().catch(() => {});
  }, [refresh, pathname, today]);
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
        canEdit:
          !error && !refreshing && (role === "owner" || role === "editor"),
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
export function DataBoundary({ children }: { children: React.ReactNode }) {
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
  if (!data)
    return (
      <div className="nl-panel" role="status">
        Loading your budget…
      </div>
    );
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
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
}
