import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase-queries";
import { getActiveAccountId } from "@/lib/account-context";
import { fetchAllPages } from "@/lib/supabase/fetch-all-pages";
import {
  parseReviewFilters,
  summarizeReviewRows,
} from "@/lib/transaction-review";
import { reviewQuery } from "@/lib/transaction-review-query";
import { resolveMerchantDisplayName } from "@/lib/merchant-grouping";

export async function GET(request: NextRequest) {
  let filters;
  try {
    filters = parseReviewFilters(request.nextUrl.searchParams);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid filters" },
      { status: 400 },
    );
  }
  try {
    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId)
      return NextResponse.json({ error: "No active account" }, { status: 400 });
    let searchMerchants: { groups: number[]; overrides: number[] } | undefined;
    if (filters.q) {
      const term = filters.q.toLowerCase();
      const [groups, overrides] = await Promise.all([
        fetchAllPages(async (from, to) => {
          const { data, error } = await supabase
            .from("merchant_groups")
            .select("id,display_name,global_merchants(display_name,status)")
            .eq("account_id", accountId)
            .order("id", { ascending: true })
            .range(from, to);
          if (error) throw error;
          return data || [];
        }),
        fetchAllPages(async (from, to) => {
          const { data, error } = await supabase
            .from("global_merchants")
            .select("id")
            .ilike("display_name", `%${filters.q.replace(/[\\%_]/g, "\\$&")}%`)
            .order("id", { ascending: true })
            .range(from, to);
          if (error) throw error;
          return data || [];
        }),
      ]);
      searchMerchants = {
        groups: groups
          .filter(
            (g: any) =>
              (g.display_name || "").toLowerCase().includes(term) ||
              (g.global_merchants?.status === "active" &&
                (g.global_merchants.display_name || "")
                  .toLowerCase()
                  .includes(term)),
          )
          .map((g) => g.id),
        overrides: overrides.map((g) => g.id),
      };
    }
    const fields = `*, merchant_groups(display_name,global_merchants(display_name,logo_url,icon_name,status)), merchant_override:global_merchants!merchant_override_id(display_name,logo_url,icon_name,status), accounts(name), credit_cards(name), transaction_tags(tags(*)), splits:transaction_splits(*,categories(name))`;
    let list = reviewQuery(
      supabase,
      accountId,
      filters,
      fields,
      true,
      searchMerchants,
    );
    const sort = filters.sort;
    list = list
      .order(
        sort === "added"
          ? "created_at"
          : sort === "largest" || sort === "smallest"
            ? "total_amount"
            : sort === "description"
              ? "description"
              : "date",
        { ascending: ["oldest", "smallest", "description"].includes(sort) },
      )
      .order("id", { ascending: false });
    const offset = (filters.page - 1) * filters.pageSize;
    const [result, totals] = await Promise.all([
      list.range(offset, offset + filters.pageSize - 1),
      fetchAllPages(async (from, to) => {
        const { data, error } = await reviewQuery(
          supabase,
          accountId,
          filters,
          "id,total_amount,transaction_type",
          false,
          searchMerchants,
        )
          .order("id", { ascending: true })
          .range(from, to);
        if (error) throw error;
        return data || [];
      }),
    ]);
    if (result.error) throw result.error;
    const transactions = (result.data || []).map((row: any) => {
      const global = row.merchant_groups?.global_merchants;
      const merchant =
        row.merchant_override || (global?.status === "active" ? global : null);
      return {
        id: row.id,
        date: row.date,
        description: row.description,
        total_amount: Number(row.total_amount),
        transaction_type: row.transaction_type || "expense",
        merchant_group_id: row.merchant_group_id,
        merchant_override_id: row.merchant_override_id,
        merchant_name: resolveMerchantDisplayName(
          row.description,
          row.merchant_override?.display_name,
          merchant?.display_name,
          row.merchant_groups?.display_name,
        ),
        merchant_logo_url: merchant?.logo_url,
        merchant_icon_name: merchant?.icon_name,
        account_id: row.account_id,
        credit_card_id: row.credit_card_id,
        account_name: row.accounts?.name,
        credit_card_name: row.credit_cards?.name,
        is_historical: !!row.is_historical,
        created_at: row.created_at,
        updated_at: row.updated_at,
        tags: (row.transaction_tags || [])
          .map((t: any) => t.tags)
          .filter(Boolean),
        splits: (row.splits || []).map((s: any) => ({
          ...s,
          amount: Number(s.amount),
          category_name: s.categories?.name || "Unknown envelope",
        })),
      };
    });
    const summary = summarizeReviewRows(
      totals as any,
      filters.categories.length > 0,
    );
    return NextResponse.json({
      transactions,
      total: result.count || 0,
      page: filters.page,
      totalPages: Math.ceil((result.count || 0) / filters.pageSize),
      summary,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("Unable to load transaction review:", error);
    return NextResponse.json(
      { error: "Could not load transactions. Please try again." },
      { status: 500 },
    );
  }
}
