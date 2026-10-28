import type { Category } from "@/lib/types";

export type Cadence = "daily" | "weekly" | "monthly";
export const INTERFACE_COOKIE = "budget-interface";
/** Keep sign-in return links on this site, including their filters/context. */
export function safeReturnPath(value: string | null, fallback = "/dashboard") {
  return value && value.startsWith("/") && !value.startsWith("//") &&
    !/[\\\u0000-\u0020]/.test(value)
    ? value
    : fallback;
}
const routes = [
  ["/new/reports/net-worth", "/net-worth"],
  ["/new/loans", "/loans"],
  ["/new/investments", "/non-cash-assets"],
  ["/new/accounts", "/accounts"],
  ["/new/budget", "/categories"],
  ["/new/imports", "/imports"],
  ["/new/transactions", "/transactions"],
  ["/new/reports", "/reports"],
  ["/new/payday", "/money-movement"],
  ["/new/plan", "/categories"],
  ["/new/income", "/income"],
  ["/new/goals", "/goals"],
  ["/new", "/dashboard"],
] as const;

export function interfaceRoute(pathname: string, target: "new" | "classic") {
  if (target === "new" && (pathname === "/settings" || pathname.startsWith("/settings/"))) return `/new${pathname}`;
  if (target === "classic" && (pathname === "/new/settings" || pathname.startsWith("/new/settings/"))) return pathname.slice(4);
  if (target === "new" && /^\/(loans|non-cash-assets)\/\d+$/.test(pathname)) return pathname.replace("/loans/", "/new/loans/").replace("/non-cash-assets/", "/new/investments/");
  if (target === "classic" && /^\/new\/(loans|investments)\/\d+$/.test(pathname)) return pathname.replace("/new/loans/", "/loans/").replace("/new/investments/", "/non-cash-assets/");
  if (target === "new" && /^\/categories\/\d+$/.test(pathname)) return pathname.replace("/categories/", "/new/budget/");
  if (target === "classic" && /^\/new\/budget\/\d+$/.test(pathname)) return pathname.replace("/new/budget/", "/categories/");
  if (target === "new" && pathname === "/income-buffer") return "/new/goals#income-buffer";
  if (target === "new" && /^\/goals\/\d+$/.test(pathname)) return `/new/goals?goal=${pathname.split("/").pop()}`;
  if (target === "classic" && pathname === "/new/accounts/manage") return "/accounts";
  if (target === "classic" && pathname === "/new/budget/manage") return "/categories";
  if (target === "new" && pathname.startsWith("/imports/"))
    return `/new${pathname}`;
  if (target === "classic" && pathname.startsWith("/new/imports/"))
    return pathname.slice(4);
  const match = routes.find(
    ([modern, classic]) => pathname === (target === "new" ? classic : modern),
  );
  if (match) return match[target === "new" ? 0 : 1];
  if (target === "new" && pathname === "/credit-cards") return "/new/accounts";
  return target === "new" ? "/new" : "/dashboard";
}

/** Preserve shared settings/import destinations, including query strings and fragments. */
export function currentInterfacePath(path: string, modern: boolean) {
  const base = path.split(/[?#]/)[0];
  if (!modern) return path;
  if (base === "/settings" || base.startsWith("/settings/") || base === "/imports" || base.startsWith("/imports/")) return `/new${path}`;
  if (base === "/dashboard") return path.replace("/dashboard", "/new");
  return path;
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function checkinPeriod(cadence: Cadence, date = new Date()) {
  if (cadence === "monthly") return localDate(date).slice(0, 7);
  if (cadence === "weekly") {
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - date.getDay());
    return localDate(sunday);
  }
  return localDate(date);
}

/** Strict decimal input: empty, exponent notation, NaN and fractional cents are invalid. */
export function parseMoney(value: string): number | null {
  const text = value.trim();
  if (!/^-?(?:\d+)(?:\.\d{0,2})?$/.test(text)) return null;
  const amount = Number(text);
  return Number.isFinite(amount) && Math.abs(amount) <= 999999999
    ? Math.round(amount * 100) / 100
    : null;
}
export const cents = (amount: number) => Math.round(amount * 100);
export const money = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    amount,
  );
export const ordinaryEnvelopes = (categories: Category[]) =>
  categories.filter((c) => !c.is_system && !c.is_buffer && !c.is_archived);
export function potentialSurplus(category: Category) {
  if (
    category.is_goal ||
    category.is_buffer ||
    category.is_system ||
    (category.category_type && category.category_type !== "monthly_expense")
  )
    return 0;
  return category.monthly_amount > 0
    ? Math.max(
        0,
        (cents(category.current_balance) - cents(category.monthly_amount)) /
          100,
      )
    : 0;
}
export interface Funding {
  categoryId: number;
  fundedAmount: number;
  remainingToFund: number;
  targetAmount: number;
}
export function remainingFunding(category: Category, fundedAmount: number) {
  // A target balance already includes prior allocations. Subtracting funding
  // again would underfund it; spending can legitimately open a new gap.
  if (category.category_type === "target_balance") {
    return (
      Math.max(
        0,
        cents(category.target_balance ?? 0) - cents(category.current_balance),
      ) / 100
    );
  }
  return (
    Math.max(0, cents(category.monthly_amount) - cents(fundedAmount)) / 100
  );
}
export function suggestAllocation(
  categories: Category[],
  funding: Funding[],
  limit: number,
  usePriority = true,
) {
  let remaining = Math.max(0, cents(limit));
  const result: Record<number, string> = {};
  const ordered = ordinaryEnvelopes(categories)
    .filter((category) => !category.is_goal)
    .sort(
      (a, b) =>
        (usePriority ? (a.priority ?? 5) - (b.priority ?? 5) : 0) ||
        a.sort_order - b.sort_order ||
        a.id - b.id,
    );
  for (const category of ordered) {
    const funded =
      funding.find((f) => f.categoryId === category.id)?.fundedAmount ?? 0;
    const needed = cents(remainingFunding(category, funded));
    const amount = Math.min(needed, remaining);
    result[category.id] = (amount / 100).toFixed(2);
    remaining -= amount;
  }
  return result;
}
