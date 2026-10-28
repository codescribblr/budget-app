import { subMonths } from "date-fns";
import type { Account, CreditCard, Loan, NonCashAsset } from "@/lib/types";
import type { NetWorthBreakdown } from "@/lib/net-worth";
import { getCreditCardBalanceOwed } from "@/lib/credit-card-balance";
import { localDate } from "@/lib/new-look";

export interface WorthSnapshot {
  snapshot_date: string;
  net_worth: number;
  total_accounts: number;
  total_assets: number;
  total_credit_cards: number;
  total_loans: number;
}
export type WorthGroup = "cash" | "assets" | "cards" | "loans";
export interface WorthItem {
  id: number;
  name: string;
  group: WorthGroup;
  value: number;
  included: boolean;
  updatedAt: string;
}
export interface WorthSummary {
  current: NetWorthBreakdown;
  change30Days: {
    amount: number;
    percent: number | null;
    baselineDate: string;
    baselineNetWorth: number;
  } | null;
  snapshotCount: number;
}
export interface WorthReport extends WorthSummary {
  items: WorthItem[];
  snapshots: WorthSnapshot[];
}
export function worthItems(
  accounts: Pick<
    Account,
    "id" | "name" | "balance" | "include_in_totals" | "updated_at"
  >[],
  cards: Pick<
    CreditCard,
    | "id"
    | "name"
    | "current_balance"
    | "credit_limit"
    | "available_credit"
    | "updated_at"
  >[],
  loans: Pick<
    Loan,
    "id" | "name" | "balance" | "include_in_net_worth" | "updated_at"
  >[],
  assets: Pick<NonCashAsset, "id" | "name" | "current_value" | "updated_at">[],
): WorthItem[] {
  return [
    ...accounts.map((a) => ({
      id: a.id,
      name: a.name,
      group: "cash" as const,
      value: Number(a.balance),
      included: a.include_in_totals === true,
      updatedAt: a.updated_at,
    })),
    ...assets.map((a) => ({
      id: a.id,
      name: a.name,
      group: "assets" as const,
      value: Number(a.current_value),
      included: true,
      updatedAt: a.updated_at,
    })),
    ...cards.map((a) => ({
      id: a.id,
      name: a.name,
      group: "cards" as const,
      value: getCreditCardBalanceOwed(a),
      included: true,
      updatedAt: a.updated_at,
    })),
    ...loans.map((a) => ({
      id: a.id,
      name: a.name,
      group: "loans" as const,
      value: Number(a.balance),
      included: a.include_in_net_worth === true,
      updatedAt: a.updated_at,
    })),
  ];
}
export type WorthRange = "1m" | "6m" | "1y" | "all";
export const worthGroups = [
  {
    key: "cash",
    label: "Cash accounts",
    field: "totalAccounts",
    snapshot: "total_accounts",
    debt: false,
    href: "/new/accounts",
  },
  {
    key: "assets",
    label: "Investments & assets",
    field: "totalAssets",
    snapshot: "total_assets",
    debt: false,
    href: "/new/investments",
  },
  {
    key: "cards",
    label: "Credit cards",
    field: "totalCreditCards",
    snapshot: "total_credit_cards",
    debt: true,
    href: "/new/accounts",
  },
  {
    key: "loans",
    label: "Loans",
    field: "totalLoans",
    snapshot: "total_loans",
    debt: true,
    href: "/new/loans",
  },
] as const;
const round = (n: number) => Math.round(n * 100) / 100 || 0;

/** Compare with a real recorded date; never invent a balance at a range boundary. */
export function worthPeriod(
  snapshots: WorthSnapshot[],
  current: NetWorthBreakdown,
  today: string,
  range: WorthRange,
) {
  const history = snapshots
    .filter((s) => s.snapshot_date <= today)
    .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
  const cutoff =
    range === "all"
      ? null
      : localDate(
          subMonths(
            new Date(`${today}T12:00:00`),
            range === "1m" ? 1 : range === "6m" ? 6 : 12,
          ),
        );
  const prior = history.filter((s) => s.snapshot_date < today);
  const baseline =
    (cutoff
      ? prior.filter((s) => s.snapshot_date <= cutoff).at(-1)
      : undefined) ??
    prior[0] ??
    null;
  const visible = baseline
    ? history.filter(
        (s) =>
          s.snapshot_date >= baseline.snapshot_date && s.snapshot_date < today,
      )
    : [];
  const points = [
    ...visible.map((s) => ({
      date: s.snapshot_date,
      value: Number(s.net_worth),
      current: false,
    })),
    { date: today, value: current.netWorth, current: true },
  ];
  const drivers = baseline
    ? worthGroups.map((g) => ({
        ...g,
        before: Number(baseline[g.snapshot]),
        after: current[g.field],
        impact: round(
          (current[g.field] - Number(baseline[g.snapshot])) * (g.debt ? -1 : 1),
        ),
      }))
    : [];
  return {
    baseline,
    points,
    drivers,
    change: baseline
      ? round(current.netWorth - Number(baseline.net_worth))
      : null,
  };
}
