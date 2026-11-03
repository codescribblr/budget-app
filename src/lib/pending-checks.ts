import { z } from "zod";
import type { PendingCheck } from "./types";
import { cents } from "./new-look";
export const pendingCheckFields = z.object({
  description: z.string().trim().min(1).max(255),
  amount: z
    .number()
    .finite()
    .positive()
    .max(99999999.99)
    .refine(
      (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001,
      "Use no more than two decimal places.",
    ),
  type: z.enum(["expense", "income"]),
});
export const pendingCheckCreate = pendingCheckFields
  .extend({
    type: pendingCheckFields.shape.type.default("expense"),
    expectedBudgetId: z.number().int().positive().optional(),
  })
  .strict();
export const pendingCheckUpdate = pendingCheckFields
  .partial()
  .extend({
    expectedRevision: z.uuid().optional(),
    expectedBudgetId: z.number().int().positive().optional(),
  })
  .strict();
export function pendingEffect(item: Pick<PendingCheck, "amount" | "type">) {
  return (
    (item.type === "income" ? cents(item.amount) : -cents(item.amount)) / 100
  );
}
export function pendingTotals(items: PendingCheck[]) {
  const outgoing =
    items
      .filter((i) => i.type === "expense")
      .reduce((n, i) => n + cents(i.amount), 0) / 100;
  const incoming =
    items
      .filter((i) => i.type === "income")
      .reduce((n, i) => n + cents(i.amount), 0) / 100;
  return { outgoing, incoming, net: (cents(incoming) - cents(outgoing)) / 100 };
}
