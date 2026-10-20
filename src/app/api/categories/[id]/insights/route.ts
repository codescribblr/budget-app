import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase-queries";
import { getActiveAccountId } from "@/lib/account-context";
import { fetchAllPages } from "@/lib/supabase/fetch-all-pages";
import {
  envelopeHistoryMonths,
  summarizeEnvelopeTransactions,
  type EnvelopeInsightRow,
} from "@/lib/envelope-insights";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0)
    return NextResponse.json({ error: "Invalid envelope ID" }, { status: 400 });
  const month = request.nextUrl.searchParams.get("month");
  const months = month && envelopeHistoryMonths(month);
  if (!months)
    return NextResponse.json({ error: "Use month=YYYY-MM" }, { status: 400 });
  try {
    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId)
      return NextResponse.json({ error: "No active account" }, { status: 400 });
    const { data: category, error } = await supabase
      .from("categories")
      .select("id")
      .eq("id", Number(id))
      .eq("account_id", accountId)
      .maybeSingle();
    if (error) throw error;
    if (!category)
      return NextResponse.json(
        { error: "Envelope not found" },
        { status: 404 },
      );
    const [year, monthNumber] = month!.split("-").map(Number);
    const end = new Date(Date.UTC(year, monthNumber, 0))
      .toISOString()
      .slice(0, 10);
    const rows = await fetchAllPages(async (from, to) => {
      const { data, error } = await supabase
        .from("transaction_splits")
        .select(
          "id, transaction_id, amount, transactions!inner(date, transaction_type, budget_account_id)",
        )
        .eq("category_id", Number(id))
        .eq("transactions.budget_account_id", accountId)
        .gte("transactions.date", `${months[0]}-01`)
        .lte("transactions.date", end)
        .order("id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as unknown as EnvelopeInsightRow[];
    });
    return NextResponse.json(summarizeEnvelopeTransactions(months, rows));
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("Unable to load envelope insights:", error);
    return NextResponse.json(
      { error: "Could not load recorded spending" },
      { status: 500 },
    );
  }
}
