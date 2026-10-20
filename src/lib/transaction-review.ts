import type { TransactionWithSplits } from "./types";
import { cents, localDate } from "./new-look";

export const transactionReviewSorts = {
  newest: "Newest transaction first",
  oldest: "Oldest transaction first",
  largest: "Largest amount first",
  smallest: "Smallest amount first",
  added: "Recently added",
  description: "Description A–Z",
} as const;
export type ReviewSort = keyof typeof transactionReviewSorts;
export interface ReviewFilters {
  q: string;
  startDate: string | null;
  endDate: string | null;
  categories: number[];
  merchants: number[];
  tags: number[];
  accounts: number[];
  cards: number[];
  types: string[];
  attention: "all" | "envelope" | "account";
  sort: ReviewSort;
  page: number;
  pageSize: number;
}
export interface ReviewSummary {
  count: number;
  expenses: number;
  income: number;
  categoryAmounts: boolean;
}
export interface TransactionReviewResult {
  transactions: TransactionWithSplits[];
  total: number;
  page: number;
  totalPages: number;
  summary: ReviewSummary;
}
function ids(value: string | null) {
  if (!value) return [];
  const values = value.split(",").map(Number);
  if (
    values.length > 100 ||
    values.some((id) => !Number.isSafeInteger(id) || id <= 0)
  )
    throw new Error("Invalid filter");
  return [...new Set(values)];
}
function date(value: string | null) {
  if (!value) return null;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new Error("Invalid date");
  return value;
}
export function parseReviewFilters(params: URLSearchParams): ReviewFilters {
  const startDate = date(params.get("startDate")),
    endDate = date(params.get("endDate"));
  if (startDate && endDate && startDate > endDate)
    throw new Error("Start date must be before end date");
  const accountValues =
    params.get("accountId")?.split(",").filter(Boolean) || [];
  if (accountValues.some((v) => !/^(account|card)-[1-9]\d*$/.test(v)))
    throw new Error("Invalid account");
  const types = [
    ...new Set(params.get("transactionType")?.split(",").filter(Boolean) || []),
  ];
  if (types.some((t) => !["income", "expense"].includes(t)))
    throw new Error("Invalid transaction type");
  const rawSort = params.get("sort") || "newest";
  if (!Object.hasOwn(transactionReviewSorts, rawSort))
    throw new Error("Invalid sort");
  const attention = params.get("attention") || "all";
  if (!["all", "envelope", "account"].includes(attention))
    throw new Error("Invalid review filter");
  const page = Number(params.get("page") || 1),
    pageSize = Number(params.get("pageSize") || 50);
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    ![25, 50, 100].includes(pageSize)
  )
    throw new Error("Invalid page");
  const q = (params.get("q") || "").trim();
  if (q.length > 200) throw new Error("Search is too long");
  return {
    q,
    startDate,
    endDate,
    categories: ids(params.get("categoryId")),
    merchants: ids(params.get("merchantGroupId")),
    tags: ids(params.get("tags")),
    accounts: ids(
      accountValues
        .filter((v) => v.startsWith("account-"))
        .map((v) => v.slice(8))
        .join(","),
    ),
    cards: ids(
      accountValues
        .filter((v) => v.startsWith("card-"))
        .map((v) => v.slice(5))
        .join(","),
    ),
    types,
    attention: attention as ReviewFilters["attention"],
    sort: rawSort as ReviewSort,
    page,
    pageSize,
  };
}
export function matchedTransactionAmount(
  transaction: TransactionWithSplits,
  categories: number[],
) {
  return categories.length
    ? transaction.splits
        .filter((s) => categories.includes(s.category_id))
        .reduce((sum, s) => sum + cents(Number(s.amount)), 0) / 100
    : Number(transaction.total_amount);
}
export function summarizeReviewRows(
  rows: Array<{
    total_amount: number | string;
    transaction_type: string | null;
    category_filter?: { amount: number | string }[];
  }>,
  categoryAmounts: boolean,
): ReviewSummary {
  let expenses = 0,
    income = 0;
  for (const row of rows) {
    const amount = categoryAmounts
      ? (row.category_filter || []).reduce(
          (sum, s) => sum + cents(Number(s.amount)),
          0,
        )
      : cents(Number(row.total_amount));
    if (!Number.isFinite(amount) || amount < 0)
      throw new Error("Invalid transaction amount");
    if (row.transaction_type === "income") income += amount;
    else expenses += amount;
  }
  return {
    count: rows.length,
    expenses: expenses / 100,
    income: income / 100,
    categoryAmounts,
  };
}
export function reviewDatePreset(
  value: string,
  now = new Date(),
): { start: string | null; end: string | null } {
  const year = now.getFullYear(),
    month = now.getMonth();
  let start: Date | null = null,
    end: Date | null = null;
  switch (value) {
    case "current-month":
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 0);
      break;
    case "last-month":
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0);
      break;
    case "week":
      start = new Date(year, month, now.getDate() - 6);
      end = now;
      break;
    case "quarter": {
      const quarter = Math.floor(month / 3) * 3;
      start = new Date(year, quarter - 3, 1);
      end = new Date(year, quarter, 0);
      break;
    }
    case "current-year":
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31);
      break;
    case "year":
      start = new Date(year - 1, 0, 1);
      end = new Date(year - 1, 11, 31);
      break;
  }
  return { start: start && localDate(start), end: end && localDate(end) };
}
