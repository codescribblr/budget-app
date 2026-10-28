import { NextRequest, NextResponse } from "next/server";
import { getActiveAccountId } from "@/lib/account-context";
import { getAuthenticatedUser } from "@/lib/supabase-queries";
import { requireRetirementPlanningNetWorthAccess } from "@/lib/net-worth-api-guard";
import {
  computeNetWorthBreakdown,
  findBaselineSnapshotNearDaysAgo,
  computePercentChange,
} from "@/lib/net-worth";
import { fetchAllPages } from "@/lib/supabase/fetch-all-pages";
import { worthItems, type WorthSnapshot } from "@/lib/net-worth-report";

export async function GET(request: NextRequest) {
  const denied = await requireRetirementPlanningNetWorthAccess();
  if (denied) return denied;
  try {
    const { supabase } = await getAuthenticatedUser();
    const budgetAccountId = await getActiveAccountId();
    if (!budgetAccountId)
      return NextResponse.json(
        { error: "No active account." },
        { status: 400 },
      );
    const details = request.nextUrl.searchParams.get("details") === "true";
    const [accountsRes, creditCardsRes, loansRes, assetsRes, snapshots] =
      await Promise.all([
        supabase
          .from("accounts")
          .select("id, name, balance, include_in_totals, updated_at")
          .eq("account_id", budgetAccountId),
        supabase
          .from("credit_cards")
          .select(
            "id, name, current_balance, credit_limit, available_credit, updated_at",
          )
          .eq("account_id", budgetAccountId),
        supabase
          .from("loans")
          .select("id, name, balance, include_in_net_worth, updated_at")
          .eq("account_id", budgetAccountId),
        supabase
          .from("non_cash_assets")
          .select("id, name, current_value, updated_at")
          .eq("account_id", budgetAccountId),
        fetchAllPages<WorthSnapshot>(async (from, to) => {
          const { data, error } = await supabase
            .from("net_worth_snapshots")
            .select(
              "snapshot_date, net_worth, total_accounts, total_assets, total_credit_cards, total_loans",
            )
            .eq("budget_account_id", budgetAccountId)
            .order("snapshot_date", { ascending: true })
            .range(from, to);
          if (error) throw error;
          return data || [];
        }),
      ]);
    const err =
      accountsRes.error ||
      creditCardsRes.error ||
      loansRes.error ||
      assetsRes.error;
    if (err) throw err;
    const accounts = accountsRes.data || [],
      cards = creditCardsRes.data || [],
      loans = loansRes.data || [],
      assets = assetsRes.data || [];
    const current = computeNetWorthBreakdown(accounts, cards, loans, assets);
    const baseline = findBaselineSnapshotNearDaysAgo(snapshots, 30);
    return NextResponse.json({
      current,
      change30Days: baseline
        ? {
            amount: current.netWorth - Number(baseline.net_worth),
            percent: computePercentChange(
              Number(baseline.net_worth),
              current.netWorth,
            ),
            baselineDate: baseline.snapshot_date,
            baselineNetWorth: Number(baseline.net_worth),
          }
        : null,
      snapshotCount: snapshots.length,
      ...(details
        ? { items: worthItems(accounts, cards, loans, assets), snapshots }
        : {}),
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("Net worth summary error:", error);
    return NextResponse.json(
      { error: "Failed to load net worth data. Please try again." },
      { status: 500 },
    );
  }
}
