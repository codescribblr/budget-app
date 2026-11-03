import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveMerchantGroupIdsForImport } from "@/lib/db/merchant-groups";
import {
  buildHistory,
  combineSuggestions,
  HISTORY_VERSION,
  type CategorySuggestion,
  type HistoryObservation,
} from "./categorization";

export function categoryFingerprint(
  row: Record<string, any>,
  merchantId: number | null,
) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        row.transaction_date,
        row.description,
        row.merchant,
        Number(row.amount),
        row.transaction_type,
        row.target_account_id,
        row.target_credit_card_id,
        merchantId,
      ]),
    )
    .digest("hex");
}
export async function categoryContext(
  db: SupabaseClient,
  budgetId: number,
  rows: Record<string, any>[],
) {
  const groups = await resolveMerchantGroupIdsForImport(
    rows.map((r) => r.description),
  );
  const ids = [...new Set(groups.filter((id): id is number => id !== null))];
  const [groupResult, categoryResult, preferences] = await Promise.all([
    ids.length
      ? db
          .from("merchant_groups")
          .select(
            "id,global_merchant_id,global_merchants(id,display_name,status,updated_at)",
          )
          .eq("account_id", budgetId)
          .in("id", ids)
      : Promise.resolve({ data: [], error: null }),
    db
      .from("categories")
      .select("id,name,notes,is_archived,is_buffer,is_system,is_goal")
      .eq("account_id", budgetId),
    db
      .from("category_review_preferences")
      .select("*")
      .eq("account_id", budgetId),
  ]);
  for (const result of [groupResult, categoryResult, preferences])
    if (result.error) throw result.error;
  const groupById = new Map<number, any>(
    (groupResult.data ?? []).map((g) => [g.id, g]),
  );
  const merchantIds = [
    ...new Set(
      (groupResult.data ?? [])
        .map((g) => g.global_merchant_id)
        .filter((id): id is number => !!id),
    ),
  ];
  const { data: history, error } = merchantIds.length
    ? await db.rpc("category_history", {
        p_budget_id: budgetId,
        p_merchants: merchantIds,
      })
    : { data: {}, error: null };
  if (error) throw error;
  const categories = (categoryResult.data ?? []).filter(
    (c) => !c.is_archived && !c.is_buffer && !c.is_system && !c.is_goal,
  );
  const eligible = new Set(categories.map((c) => c.id));
  const suggestions = rows.map((r, index) => {
    const group = groupById.get(groups[index]!);
    const merchant = Array.isArray(group?.global_merchants)
      ? group.global_merchants[0]
      : group?.global_merchants;
    const merchantId = merchant?.status === "active" ? merchant.id : null;
    const fingerprint = categoryFingerprint(r, merchantId);
    const prior = r.category_suggestion as CategorySuggestion | null;
    const preference = (preferences.data ?? []).find(
      (p) => p.merchant_id === merchantId,
    );
    const s: CategorySuggestion = {
      version: 1,
      fingerprint,
      merchantId,
      merchantName: merchant?.display_name ?? r.merchant,
      historyVersion: HISTORY_VERSION,
      generatedAt: new Date().toISOString(),
      alwaysAsk: !!preference?.always_ask,
      preferenceRevision: preference?.revision ?? null,
      history: buildHistory(
        (history?.[merchantId] ?? []) as HistoryObservation[],
        r.transaction_type,
        eligible,
      ),
      outcome: "ask",
      source: null,
      categoryId: null,
      reason: "",
      ...(prior?.fingerprint === fingerprint && prior.ai
        ? { ai: prior.ai }
        : {}),
    };
    // Unfamiliar amounts can only lower trust, never establish purpose.
    const amounts = s.history.recent
      .filter((h) => h.confirmed)
      .map((h) => h.amount);
    if (
      !merchantId ||
      (amounts.length && Number(r.amount) > Math.max(...amounts) * 2)
    )
      s.history.eligible = false;
    return combineSuggestions(s);
  });
  return { categories, suggestions, preferences: preferences.data ?? [] };
}
