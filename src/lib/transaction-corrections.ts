import { z } from "zod";
import type { Category, TransactionWithSplits } from "./types";

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(value);
    return (
      value >= "0001-01-01" &&
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Choose a valid date.");
export const correctionPatchSchema = z
  .object({
    date: date.optional(),
    account_id: id.nullable().optional(),
    credit_card_id: id.nullable().optional(),
    transaction_type: z.enum(["expense", "income"]).optional(),
    is_historical: z.boolean().optional(),
  })
  .strict()
  .refine(
    (patch) => Object.keys(patch).length > 0,
    "Choose at least one correction.",
  )
  .refine(
    (patch) =>
      (patch.account_id !== undefined) === (patch.credit_card_id !== undefined),
    "Choose one account or card.",
  )
  .refine(
    (patch) => !(patch.account_id != null && patch.credit_card_id != null),
    "Choose one account or card.",
  );
export const correctionRequestSchema = z
  .object({
    expectedBudgetId: id,
    operationId: z.uuid(),
    records: z
      .array(z.object({ id, revision: z.uuid() }).strict())
      .min(1)
      .max(100)
      .refine(
        (rows) => new Set(rows.map((row) => row.id)).size === rows.length,
        "Select each transaction once.",
      ),
    patch: correctionPatchSchema,
  })
  .strict();
export type TransactionCorrection = z.infer<typeof correctionPatchSchema>;
export type CorrectionRecord = Pick<
  TransactionWithSplits,
  | "id"
  | "revision"
  | "description"
  | "date"
  | "total_amount"
  | "account_id"
  | "credit_card_id"
  | "transaction_type"
  | "is_historical"
  | "splits"
>;
export type CorrectionResult = { updated: number; transactionIds: number[] };

export function correctionChanges(
  record: CorrectionRecord,
  patch: TransactionCorrection,
) {
  return Object.entries(patch)
    .filter(([key, value]) => {
      const previous = record[key as keyof CorrectionRecord];
      return (previous ?? null) !== value;
    })
    .map(([field, after]) => ({
      field,
      before: record[field as keyof CorrectionRecord] ?? null,
      after,
    }));
}

/** Mirror save_transaction_command: reverse the old effect and apply the new
 * one; historical transactions and system categories never move envelope money. */
export function correctionImpact(
  records: CorrectionRecord[],
  patch: TransactionCorrection,
  categories: Pick<Category, "id" | "name" | "is_system">[],
) {
  const deltas = new Map<number, number>();
  for (const record of records) {
    const next = { ...record, ...patch };
    const sign = (
      t: Pick<CorrectionRecord, "is_historical" | "transaction_type">,
    ) => (t.is_historical ? 0 : t.transaction_type === "income" ? 1 : -1);
    for (const split of record.splits) {
      const category = categories.find((c) => c.id === split.category_id);
      if (!category || category.is_system) continue;
      const delta =
        Math.round(Number(split.amount) * 100) * (sign(next) - sign(record));
      deltas.set(category.id, (deltas.get(category.id) ?? 0) + delta);
    }
  }
  return [...deltas]
    .filter(([, cents]) => cents !== 0)
    .map(([id, cents]) => ({
      id,
      name: categories.find((c) => c.id === id)!.name,
      amount: cents / 100,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
