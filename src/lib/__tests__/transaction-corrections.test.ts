import { describe, expect, it } from "vitest";
import {
  correctionChanges,
  correctionImpact,
  correctionPatchSchema,
  correctionRequestSchema,
  type CorrectionRecord,
} from "../transaction-corrections";
const record = (patch: Partial<CorrectionRecord> = {}): CorrectionRecord => ({
  id: 1,
  revision: "00000000-0000-4000-8000-000000000001",
  date: "2026-10-30",
  description: "Test",
  total_amount: 30.03,
  transaction_type: "expense",
  is_historical: false,
  account_id: 1,
  credit_card_id: null,
  splits: [
    {
      id: 1,
      transaction_id: 1,
      category_id: 1,
      amount: 20.01,
      category_name: "Food",
      created_at: "",
    },
    {
      id: 2,
      transaction_id: 1,
      category_id: 2,
      amount: 10.02,
      category_name: "Fuel",
      created_at: "",
    },
  ],
  ...patch,
});
const categories = [
  { id: 1, name: "Food", is_system: false },
  { id: 2, name: "Fuel", is_system: false },
];
describe("correction preview", () => {
  it("reverses expenses before adding income, preserving every split", () => {
    expect(
      correctionImpact([record()], { transaction_type: "income" }, categories),
    ).toEqual([
      { id: 1, name: "Food", amount: 40.02 },
      { id: 2, name: "Fuel", amount: 20.04 },
    ]);
  });
  it("does not double-count simultaneous direction and historical changes", () => {
    expect(
      correctionImpact(
        [record()],
        { transaction_type: "income", is_historical: true },
        categories,
      ).map((c) => c.amount),
    ).toEqual([20.01, 10.02]);
    expect(
      correctionImpact(
        [record({ is_historical: true })],
        { transaction_type: "income", is_historical: false },
        categories,
      ).map((c) => c.amount),
    ).toEqual([20.01, 10.02]);
  });
  it("keeps historical and system envelopes out of money movements", () => {
    expect(
      correctionImpact(
        [record({ is_historical: true })],
        { transaction_type: "income" },
        categories,
      ),
    ).toEqual([]);
    expect(
      correctionImpact(
        [record()],
        { transaction_type: "income" },
        categories.map((c) => ({ ...c, is_system: true })),
      ),
    ).toEqual([]);
  });
  it("date and account changes do not move money", () => {
    expect(
      correctionImpact(
        [record()],
        { date: "2026-11-01", account_id: null, credit_card_id: 2 },
        categories,
      ),
    ).toEqual([]);
  });
  it("nets opposing directions in cents and omits unchanged records", () => {
    expect(
      correctionImpact(
        [record(), record({ transaction_type: "income" })],
        { is_historical: true },
        categories,
      ),
    ).toEqual([]);
    expect(
      correctionChanges(record(), {
        date: "2026-10-30",
        account_id: 1,
        credit_card_id: null,
      }),
    ).toEqual([]);
    expect(
      correctionChanges(
        record({ account_id: undefined, credit_card_id: undefined }),
        { account_id: null, credit_card_id: null },
      ),
    ).toEqual([]);
  });
});
describe("correction validation", () => {
  it.each([
    {},
    { date: "2026-02-30" },
    { date: "0000-01-01" },
    { transaction_type: "credit" },
    { is_historical: "true" },
    { splits: [] },
    { total_amount: 10 },
    { account_id: 1 },
    { account_id: 1, credit_card_id: 2 },
    { account_id: -1, credit_card_id: null },
  ])("rejects invalid corrections: %j", (patch) =>
    expect(correctionPatchSchema.safeParse(patch).success).toBe(false),
  );
  it("accepts leap dates and explicit account removal", () => {
    expect(
      correctionPatchSchema.safeParse({
        date: "2028-02-29",
        account_id: null,
        credit_card_id: null,
      }).success,
    ).toBe(true);
  });
  it("requires unique versioned records and an operation identity", () => {
    const row = { id: 1, revision: record().revision };
    const body = {
      expectedBudgetId: 27,
      operationId: crypto.randomUUID(),
      records: [row],
      patch: { is_historical: true },
    };
    expect(correctionRequestSchema.safeParse(body).success).toBe(true);
    for (const patch of [
      { records: [] },
      { records: [row, row] },
      { records: [{ id: 1 }] },
      {
        records: Array.from({ length: 101 }, (_, i) => ({ ...row, id: i + 1 })),
      },
      { operationId: null },
      { expectedBudgetId: 0 },
    ])
      expect(
        correctionRequestSchema.safeParse({ ...body, ...patch }).success,
      ).toBe(false);
  });
});
