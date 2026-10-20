import { cents } from "./new-look";

export interface EnvelopeInsightRow {
  id: number;
  transaction_id: number;
  amount: number | string;
  transactions: { date: string; transaction_type: string | null };
}
export interface EnvelopeMonth {
  month: string;
  expenses: number;
  incoming: number;
  transactionCount: number;
}
export interface EnvelopeInsights {
  months: EnvelopeMonth[];
  latestTransactionDate: string | null;
}

export function envelopeHistoryMonths(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [year, number] = month.split("-").map(Number);
  if (year < 1900 || year > 2100) return null;
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(year, number - 6 + index, 1));
    return date.toISOString().slice(0, 7);
  });
}

/** Sum only this envelope's splits; income and expenses never cancel each other. */
export function summarizeEnvelopeTransactions(
  months: string[],
  rows: EnvelopeInsightRow[],
): EnvelopeInsights {
  const totals = new Map(
    months.map((month) => [
      month,
      { expenses: 0, incoming: 0, ids: new Set<number>() },
    ]),
  );
  let latestTransactionDate: string | null = null;
  for (const row of rows) {
    const transaction = row.transactions;
    const month = totals.get(transaction.date.slice(0, 7));
    if (!month) continue;
    const amount = cents(Number(row.amount));
    if (!Number.isFinite(amount)) throw new Error("Invalid transaction amount");
    if (transaction.transaction_type === "income") month.incoming += amount;
    else month.expenses += amount;
    month.ids.add(row.transaction_id);
    if (!latestTransactionDate || transaction.date > latestTransactionDate)
      latestTransactionDate = transaction.date;
  }
  return {
    months: months.map((month) => {
      const total = totals.get(month)!;
      return {
        month,
        expenses: total.expenses / 100,
        incoming: total.incoming / 100,
        transactionCount: total.ids.size,
      };
    }),
    latestTransactionDate,
  };
}
