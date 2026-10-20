import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReviewFilters } from "./transaction-review";

/** Related filters are applied in SQL before count/range, never to a truncated ID list. */
export function reviewQuery(
  supabase: SupabaseClient,
  accountId: number,
  filters: ReviewFilters,
  fields: string,
  count = false,
  searchMerchants?: { groups: number[]; overrides: number[] },
) {
  const related: string[] = [];
  if (filters.categories.length)
    related.push(
      "category_filter:transaction_splits!inner(category_id,amount)",
    );
  if (filters.attention === "envelope")
    related.push("empty_envelope:transaction_splits(id)");
  filters.tags.forEach((_, i) =>
    related.push(`tag_filter_${i}:transaction_tags!inner(tag_id)`),
  );
  let query = supabase
    .from("transactions")
    .select(
      [fields, ...related].join(","),
      count ? { count: "exact" } : undefined,
    )
    .eq("budget_account_id", accountId);
  if (filters.startDate) query = query.gte("date", filters.startDate);
  if (filters.endDate) query = query.lte("date", filters.endDate);
  if (filters.q) {
    const pattern = `%${filters.q.replace(/[\\%_]/g, "\\$&")}%`;
    if (searchMerchants?.groups.length || searchMerchants?.overrides.length) {
      const alternatives = [`description.ilike.${JSON.stringify(pattern)}`];
      if (searchMerchants.groups.length)
        alternatives.push(
          `merchant_group_id.in.(${searchMerchants.groups.join(",")})`,
        );
      if (searchMerchants.overrides.length)
        alternatives.push(
          `merchant_override_id.in.(${searchMerchants.overrides.join(",")})`,
        );
      query = query.or(alternatives.join(","));
    } else query = query.ilike("description", pattern);
  }
  if (filters.categories.length)
    query = query.in("category_filter.category_id", filters.categories);
  if (filters.merchants.length)
    query = query.in("merchant_group_id", filters.merchants);
  if (filters.types.length) query = query.in("transaction_type", filters.types);
  filters.tags.forEach((id, i) => {
    query = query.eq(`tag_filter_${i}.tag_id`, id);
  });
  if (filters.accounts.length && filters.cards.length)
    query = query.or(
      `account_id.in.(${filters.accounts.join(",")}),credit_card_id.in.(${filters.cards.join(",")})`,
    );
  else if (filters.accounts.length)
    query = query.in("account_id", filters.accounts);
  else if (filters.cards.length)
    query = query.in("credit_card_id", filters.cards);
  if (filters.attention === "envelope")
    query = query.is("empty_envelope", null);
  if (filters.attention === "account")
    query = query.is("account_id", null).is("credit_card_id", null);
  return query;
}
