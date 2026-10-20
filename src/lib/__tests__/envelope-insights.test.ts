import { describe, expect, it } from "vitest";
import { envelopeHistoryMonths, summarizeEnvelopeTransactions, type EnvelopeInsightRow } from "../envelope-insights";

const row = (id: number, transactionId: number, amount: number, date: string, type = "expense"): EnvelopeInsightRow => ({ id, transaction_id: transactionId, amount, transactions: { date, transaction_type: type } });
describe("envelope spending context", () => {
  it("builds six complete calendar buckets across a year boundary", () => {
    expect(envelopeHistoryMonths("2026-02")).toEqual(["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"]);
    for (const month of ["", "2026-13", "2026-00", "2026-2", "0000-01", "2026-10-01"]) expect(envelopeHistoryMonths(month)).toBeNull();
  });
  it("keeps expenses and categorized income separate and counts split transactions once", () => {
    expect(summarizeEnvelopeTransactions(["2026-09", "2026-10"], [
      row(1, 1, 10.1, "2026-10-05"), row(2, 1, 20.2, "2026-10-05"),
      row(3, 2, 50, "2026-10-08", "income"), row(4, 3, 999, "2026-08-01"),
    ])).toEqual({ months: [
      { month: "2026-09", expenses: 0, incoming: 0, transactionCount: 0 },
      { month: "2026-10", expenses: 30.3, incoming: 50, transactionCount: 2 },
    ], latestTransactionDate: "2026-10-08" });
  });
  it("does not turn invalid monetary data into a plausible chart", () => {
    expect(() => summarizeEnvelopeTransactions(["2026-10"], [row(1, 1, NaN, "2026-10-01")])).toThrow();
  });
});
