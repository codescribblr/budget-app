import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getAllAccounts, getAllCreditCards, getAllCategories, getDashboardSummary } from "@/lib/supabase-queries";
import { getActiveAccountId, getUserAccounts } from "@/lib/account-context";
import { GET as fundingRead } from "@/app/api/monthly-funding/[month]/route";
import { GET as spendingRead } from "@/app/api/categories/monthly-spending/route";

export async function GET(request: NextRequest) {
  try {
    const month = request.nextUrl.searchParams.get("month");
    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    const { user, supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) return NextResponse.json({ error: "Select a budget first." }, { status: 403 });
    const expected = request.nextUrl.searchParams.get("budgetId");
    if (expected && expected !== String(accountId)) return NextResponse.json({ error: "The active budget changed. Reload to view it.", code: "BUDGET_CHANGED" }, { status: 409 });
    // Capture tokens before the data reads; a concurrent commit then forces a
    // trailing read instead of acknowledging a version newer than the data.
    const versions = await supabase.from("budget_resource_versions").select("resource,revision").eq("account_id",accountId);
    if (versions.error) throw versions.error;
    const [accounts,cards,categories,summary,memberships,funding,spending] = await Promise.all([
      getAllAccounts(), getAllCreditCards(), getAllCategories(), getDashboardSummary(), getUserAccounts(),
      fundingRead(request, { params: Promise.resolve({ month: `${month}-01` }) }),
      spendingRead(new Request(new URL(`/api/categories/monthly-spending?month=${month}`, request.url))),
    ]);
    if (!funding.ok || !spending.ok) throw new Error("Your monthly figures could not be refreshed.");
    return NextResponse.json({ accounts,cards,categories,summary, resourceTokens: Object.fromEntries((versions.data ?? []).map(v => [v.resource,v.revision])),
      identity: { activeAccountId: accountId, accounts: memberships }, userId: user.id,
      funding: await funding.json(), spending: await spending.json(),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message=error instanceof Error ? error.message : "Your budget could not be refreshed.";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}
