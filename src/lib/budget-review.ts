import { cents } from "./new-look";
export interface ReviewPeriod {
  start: string | null;
  end: string | null;
}
export function parseReportPeriod(params: URLSearchParams): ReviewPeriod {
  function date(key: string) {
    const value = params.get(key);
    if (!value) return null;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value ||
      value < "1900-01-01" ||
      value > "2100-12-31"
    )
      throw new Error("Choose valid report dates.");
    return value;
  }
  const start = date("startDate"),
    end = date("endDate");
  if (start && end && start > end)
    throw new Error("Start date must be on or before end date.");
  return { start, end };
}
const shift = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
export function comparisonPeriod(period: ReviewPeriod): ReviewPeriod | null {
  if (!period.start || !period.end) return null;
  // Match complete calendar months; otherwise use the immediately preceding equal-length period.
  const start = new Date(`${period.start}T00:00:00Z`),
    end = new Date(`${period.end}T00:00:00Z`);
  const last = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
  );
  if (
    start.getUTCDate() === 1 &&
    end.getTime() === last.getTime() &&
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCFullYear() === end.getUTCFullYear()
  )
    return {
      start: new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1),
      )
        .toISOString()
        .slice(0, 10),
      end: shift(period.start, -1),
    };
  // Month-to-date follows the same days of the previous month, not its final weeks.
  if (
    start.getUTCDate() === 1 &&
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCFullYear() === end.getUTCFullYear()
  ) {
    const lastPrevious = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 0),
    ).getUTCDate();
    return {
      start: new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1),
      )
        .toISOString()
        .slice(0, 10),
      end: new Date(
        Date.UTC(
          start.getUTCFullYear(),
          start.getUTCMonth() - 1,
          Math.min(end.getUTCDate(), lastPrevious),
        ),
      )
        .toISOString()
        .slice(0, 10),
    };
  }
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return { start: shift(period.start, -days), end: shift(period.start, -1) };
}
export function completedReportMonths(today: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(today) ||
    !Number.isFinite(Date.parse(today)) ||
    new Date(today).toISOString().slice(0, 10) !== today ||
    today < "1900-01-01" ||
    today > "2100-12-31"
  )
    throw new Error("Use a valid as-of date.");
  const [year, month] = today.split("-").map(Number);
  return [3, 2, 1].map((offset) =>
    new Date(Date.UTC(year, month - 1 - offset, 1)).toISOString().slice(0, 7),
  );
}
export interface ReportCategory {
  id: number;
  name: string;
  monthly_amount: number;
  current_balance: number;
  is_system?: boolean;
  is_buffer?: boolean;
  is_archived?: boolean;
  is_goal?: boolean;
  category_type?: string;
}
export interface ReportTransaction {
  id: number;
  date: string;
  total_amount: number | string;
  transaction_type: string | null;
  merchant_name?: string;
  merchant_group_id?: number | null;
  merchant_override_id?: number | null;
  splits: { category_id: number; amount: number | string }[];
}
export interface ReportEnvelope {
  id: number | null;
  name: string;
  expenses: number;
  incoming: number;
  previousExpenses: number;
  currentBalance: number | null;
  monthlyBudget: number | null;
  archived: boolean;
  system: boolean;
  months: { month: string; expenses: number; incoming: number }[];
}
export interface BudgetReview {
  period: ReviewPeriod;
  comparison: ReviewPeriod | null;
  advanced: boolean;
  includeSystem: boolean;
  totals: {
    expenses: number;
    incoming: number;
    count: number;
    previousExpenses: number;
    previousCount: number;
    unassigned: number;
    excluded: number;
  };
  categories: ReportEnvelope[];
  merchants: {
    name: string;
    expenses: number;
    count: number;
    groupId: number | null;
  }[];
  months: {
    month: string;
    expenses: number;
    incoming: number;
    count: number;
  }[];
  latestTransactionDate: string | null;
  plan: {
    id: number;
    name: string;
    monthlyBudget: number;
    averageExpenses: number;
    averageIncoming: number;
    monthsWithSpending: number;
  }[];
}
export function summarizeBudgetReview(
  rows: ReportTransaction[],
  categories: ReportCategory[],
  period: ReviewPeriod,
  comparison: ReviewPeriod | null,
  months: string[],
  includeSystem = false,
  categoryId: number | null = null,
): BudgetReview {
  const within = (date: string, range: ReviewPeriod) =>
    (!range.start || date >= range.start) && (!range.end || date <= range.end);
  const map = new Map<number | null, ReportEnvelope>();
  const definitions = new Map(categories.map((c) => [c.id, c]));
  const monthly = new Map(
    months.map((month) => [
      month,
      { month, expenses: 0, incoming: 0, ids: new Set<number>() },
    ]),
  );
  const merchants = new Map<
    string,
    { name: string; expenses: number; ids: Set<number>; groupId: number | null }
  >();
  let expenses = 0,
    incoming = 0,
    previousExpenses = 0,
    unassigned = 0,
    excluded = 0,
    latest: string | null = null;
  const currentIds = new Set<number>(),
    previousIds = new Set<number>();
  function envelope(id: number | null) {
    if (!map.has(id)) {
      const c = id === null ? undefined : definitions.get(id);
      map.set(id, {
        id,
        name: c?.name || "No envelope",
        expenses: 0,
        incoming: 0,
        previousExpenses: 0,
        currentBalance: c ? Number(c.current_balance) : null,
        monthlyBudget: c ? Number(c.monthly_amount) : null,
        archived: !!c?.is_archived,
        system: !!(c?.is_system || c?.is_buffer),
        months: months.map((month) => ({ month, expenses: 0, incoming: 0 })),
      });
    }
    return map.get(id)!;
  }
  for (const row of rows) {
    const current = within(row.date, period),
      previous = comparison ? within(row.date, comparison) : false;
    const month = monthly.get(row.date.slice(0, 7));
    if (!current && !previous && !month) continue;
    const isIncome = row.transaction_type === "income";
    const total = cents(Number(row.total_amount));
    if (!Number.isSafeInteger(total) || total < 0)
      throw new Error("Invalid transaction amount.");
    let allocated = 0,
      visible = 0;
    const portions = row.splits.map((s) => {
      const amount = cents(Number(s.amount));
      if (!Number.isSafeInteger(amount) || amount < 0)
        throw new Error("Invalid split amount.");
      allocated += amount;
      return {
        id: definitions.has(s.category_id) ? s.category_id : null,
        amount,
      };
    });
    if (allocated > total)
      throw new Error(
        "Transaction split amounts exceed the transaction total.",
      );
    if (total > allocated)
      portions.push({ id: null, amount: total - allocated });
    for (const part of portions) {
      if (categoryId !== null && part.id !== categoryId) continue;
      const category = part.id === null ? undefined : definitions.get(part.id);
      if (!includeSystem && (category?.is_system || category?.is_buffer)) {
        if (current) excluded += part.amount;
        continue;
      }
      visible += part.amount;
      const entry = envelope(part.id);
      if (current) {
        if (isIncome) {
          incoming += part.amount;
          entry.incoming += part.amount;
        } else {
          expenses += part.amount;
          entry.expenses += part.amount;
          if (part.id === null) unassigned += part.amount;
        }
      }
      if (previous && !isIncome) {
        previousExpenses += part.amount;
        entry.previousExpenses += part.amount;
      }
      if (month) {
        if (isIncome) month.incoming += part.amount;
        else month.expenses += part.amount;
        const em = entry.months.find((m) => m.month === month.month)!;
        if (isIncome) em.incoming += part.amount;
        else em.expenses += part.amount;
      }
    }
    if (visible > 0) {
      if (current) {
        currentIds.add(row.id);
        if (!latest || row.date > latest) latest = row.date;
        if (!isIncome) {
          const name = row.merchant_name || "Unassigned merchant";
          const key = row.merchant_override_id
            ? `override:${row.merchant_override_id}`
            : row.merchant_group_id
              ? `g:${row.merchant_group_id}`
              : `n:${name}`;
          if (!merchants.has(key))
            merchants.set(key, {
              name,
              expenses: 0,
              ids: new Set(),
              groupId: row.merchant_override_id
                ? null
                : row.merchant_group_id || null,
            });
          const merchant = merchants.get(key)!;
          merchant.expenses += visible;
          merchant.ids.add(row.id);
        }
      }
      if (previous) previousIds.add(row.id);
      if (month) month.ids.add(row.id);
    }
  }
  const values = [...map.values()].map((c) => ({
    ...c,
    expenses: c.expenses / 100,
    incoming: c.incoming / 100,
    previousExpenses: c.previousExpenses / 100,
    months: c.months.map((m) => ({
      ...m,
      expenses: m.expenses / 100,
      incoming: m.incoming / 100,
    })),
  }));
  const plan = months.length
    ? categories
        .filter(
          (c) =>
            !c.is_system &&
            !c.is_buffer &&
            !c.is_archived &&
            !c.is_goal &&
            (!c.category_type || c.category_type === "monthly_expense"),
        )
        .map((c) => {
          const history = values.find((e) => e.id === c.id)?.months || [];
          return {
            id: c.id,
            name: c.name,
            monthlyBudget: Number(c.monthly_amount),
            averageExpenses:
              Math.round(
                history.reduce((s, m) => s + cents(m.expenses), 0) /
                  months.length,
              ) / 100,
            averageIncoming:
              Math.round(
                history.reduce((s, m) => s + cents(m.incoming), 0) /
                  months.length,
              ) / 100,
            monthsWithSpending: history.filter((m) => m.expenses > 0).length,
          };
        })
        .filter((c) => c.averageExpenses > 0)
        .sort(
          (a, b) =>
            b.averageExpenses -
            b.monthlyBudget -
            (a.averageExpenses - a.monthlyBudget),
        )
    : [];
  return {
    period,
    comparison,
    advanced: months.length > 0,
    includeSystem,
    totals: {
      expenses: expenses / 100,
      incoming: incoming / 100,
      count: currentIds.size,
      previousExpenses: previousExpenses / 100,
      previousCount: previousIds.size,
      unassigned: unassigned / 100,
      excluded: excluded / 100,
    },
    categories: values
      .filter((c) => c.expenses || c.incoming || c.previousExpenses)
      .sort((a, b) => b.expenses - a.expenses),
    merchants: [...merchants.values()]
      .map((m) => ({
        name: m.name,
        expenses: m.expenses / 100,
        count: m.ids.size,
        groupId: m.groupId,
      }))
      .sort((a, b) => b.expenses - a.expenses),
    months: [...monthly.values()].map((m) => ({
      month: m.month,
      expenses: m.expenses / 100,
      incoming: m.incoming / 100,
      count: m.ids.size,
    })),
    latestTransactionDate: latest,
    plan,
  };
}
