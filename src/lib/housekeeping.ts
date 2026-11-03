import { z } from "zod";
import type { Category, GoalWithDetails } from "./types";
export type ManagedEnvelope = Category & {
  usage: { kind: string; count: number }[];
  linkedGoals: { id: number; name: string }[];
  spending: number;
};
const record = z
  .object({ id: z.number().int().positive(), revision: z.string().uuid() })
  .strict();
const records = z
  .array(record)
  .min(1)
  .max(1000)
  .refine((r) => new Set(r.map((x) => x.id)).size === r.length);
export const envelopeCommandSchema = z.discriminatedUnion("action", [
  z
    .object({ action: z.enum(["order", "archive", "restore"]), records })
    .strict(),
  z
    .object({ action: z.literal("delete"), records: z.tuple([record]) })
    .strict(),
  z
    .object({
      action: z.literal("rename-system"),
      records: z.tuple([record]),
      name: z.string().trim().min(1).max(100),
      notes: z.string().max(2000),
    })
    .strict(),
]);
const source = z
  .object({
    table: z.enum([
      "categories",
      "accounts",
      "loans",
      "credit_cards",
      "non_cash_assets",
    ]),
    id: z.number().int().positive(),
  })
  .strict();
const goalBase = {
  id: z.number().int().positive(),
  revision: z.string().uuid(),
  sourceRevisions: z.record(z.string(), z.string().uuid()),
};
export const goalCommandSchema = z.discriminatedUnion("action", [
  z.object({ ...goalBase, action: z.literal("delete") }).strict(),
  z.object({ ...goalBase, action: z.literal("relink"), source }).strict(),
]);
const metadata = {
  expectedBudgetId: z.number().int().positive(),
  operationId: z.string().uuid(),
};
export const envelopeHousekeepingSchema = z
  .object({ ...metadata, command: envelopeCommandSchema })
  .strict();
export const goalHousekeepingSchema = z
  .object({ ...metadata, command: goalCommandSchema })
  .strict();
export function archiveBlock(c: ManagedEnvelope) {
  if (c.is_system || c.is_buffer) return "Managed by the app";
  if (c.is_goal || c.linkedGoals.length)
    return `Linked to ${c.linkedGoals.map((g) => g.name).join(", ") || "a goal"}`;
  if (!c.is_archived && c.current_balance !== 0)
    return c.current_balance < 0
      ? "Cover the shortfall first"
      : "Move the money out first";
  return null;
}
export function deleteBlock(c: ManagedEnvelope) {
  return (
    archiveBlock(c) ||
    (c.current_balance !== 0
      ? "Move the remaining money first"
      : c.usage.length
        ? "Has history or linked records. Archive to keep them."
        : null)
  );
}
const usageNames: Record<string, string> = {
  transaction_splits: "Transactions",
  category_balance_audit: "Balance history",
  category_monthly_funding: "Funding history",
  goals: "Goal links",
  queued_imports: "Queued imports",
  import_reviews: "Import reviews",
  merchant_mappings: "Merchant links",
  merchant_category_rules: "Category rules",
  recurring_transactions: "Recurring transactions",
  ai_categorization_suggestions: "Categorization records",
};
export const usageLabel = (kind: string) =>
  usageNames[kind] || "Other linked records";
export function goalSource(goal: GoalWithDetails) {
  if (goal.linked_category)
    return { table: "categories" as const, ...goal.linked_category };
  if (goal.linked_account)
    return { table: "accounts" as const, ...goal.linked_account };
  if (goal.linked_loan) return { table: "loans" as const, ...goal.linked_loan };
  if (goal.linked_credit_card)
    return { table: "credit_cards" as const, ...goal.linked_credit_card };
  if (goal.linked_non_cash_asset)
    return { table: "non_cash_assets" as const, ...goal.linked_non_cash_asset };
  return null;
}
