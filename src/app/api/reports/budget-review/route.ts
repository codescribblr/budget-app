import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase-queries";
import { getActiveAccountId } from "@/lib/account-context";
import { getUserSubscription, isPremiumUser } from "@/lib/subscription-utils";
import { fetchAllPages } from "@/lib/supabase/fetch-all-pages";
import {
  parseReportPeriod,
  comparisonPeriod,
  completedReportMonths,
  summarizeBudgetReview,
  type ReportCategory,
  type ReportTransaction,
} from "@/lib/budget-review";
import { resolveMerchantDisplayName } from "@/lib/merchant-grouping";
export async function GET(request: NextRequest) {
  let period, months;
  const rawCategory = request.nextUrl.searchParams.get("categoryId");
  const categoryId = rawCategory ? Number(rawCategory) : null;
  if (
    rawCategory &&
    (!/^\d+$/.test(rawCategory) ||
      !Number.isSafeInteger(categoryId) ||
      categoryId! <= 0)
  )
    return NextResponse.json({ error: "Invalid envelope" }, { status: 400 });
  try {
    period = parseReportPeriod(request.nextUrl.searchParams);
    months = completedReportMonths(
      request.nextUrl.searchParams.get("asOf") ||
        new Date().toISOString().slice(0, 10),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid dates" },
      { status: 400 },
    );
  }
  try {
    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId)
      return NextResponse.json({ error: "No active account" }, { status: 400 });
    const [subscription, flag] = await Promise.all([
      getUserSubscription(accountId),
      supabase
        .from("user_feature_flags")
        .select("enabled")
        .eq("account_id", accountId)
        .eq("feature_name", "advanced_reporting")
        .maybeSingle(),
    ]);
    if (flag.error) throw flag.error;
    const advanced = isPremiumUser(subscription) && flag.data?.enabled === true;
    const comparison = advanced ? comparisonPeriod(period) : null;
    const historyMonths = advanced ? months : [];
    const lower = [
      period.start,
      comparison?.start,
      historyMonths.length ? `${historyMonths[0]}-01` : null,
    ].filter(Boolean) as string[];
    const upper = [
      period.end,
      comparison?.end,
      historyMonths.length
        ? new Date(
            Date.UTC(
              Number(months[2].slice(0, 4)),
              Number(months[2].slice(5, 7)),
              0,
            ),
          )
            .toISOString()
            .slice(0, 10)
        : null,
    ].filter(Boolean) as string[];
    const [categories, rows] = await Promise.all([
      fetchAllPages(async (from, to) => {
        const { data, error } = await supabase
          .from("categories")
          .select(
            "id,name,monthly_amount,current_balance,is_system,is_buffer,is_archived,is_goal,category_type",
          )
          .eq("account_id", accountId)
          .order("id", { ascending: true })
          .range(from, to);
        if (error) throw error;
        return data || [];
      }),
      fetchAllPages(async (from, to) => {
        let query = supabase
          .from("transactions")
          .select(
            "id,date,total_amount,transaction_type,description,merchant_group_id,merchant_override_id,merchant_groups(display_name,global_merchants(display_name,status)),merchant_override:global_merchants!merchant_override_id(display_name),splits:transaction_splits(category_id,amount)",
          )
          .eq("budget_account_id", accountId);
        if (period.start && lower.length)
          query = query.gte("date", lower.sort()[0]);
        if (period.end && upper.length)
          query = query.lte("date", upper.sort().at(-1)!);
        const { data, error } = await query
          .order("id", { ascending: true })
          .range(from, to);
        if (error) throw error;
        return data || [];
      }),
    ]);
    if (categoryId !== null && !categories.some((c) => c.id === categoryId))
      return NextResponse.json(
        { error: "Envelope not found" },
        { status: 404 },
      );
    const transactions = rows.map((row: any) => ({
      ...row,
      merchant_name: resolveMerchantDisplayName(
        row.description,
        row.merchant_override?.display_name,
        row.merchant_groups?.global_merchants?.status === "active"
          ? row.merchant_groups.global_merchants.display_name
          : undefined,
        row.merchant_groups?.display_name,
      ),
      splits: row.splits || [],
    })) as ReportTransaction[];
    return NextResponse.json(
      summarizeBudgetReview(
        transactions,
        categories as ReportCategory[],
        period,
        comparison,
        historyMonths,
        request.nextUrl.searchParams.get("includeSystem") === "true",
        categoryId,
      ),
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("Unable to load budget review:", error);
    return NextResponse.json(
      { error: "Reports could not be loaded completely. Please try again." },
      { status: 500 },
    );
  }
}
