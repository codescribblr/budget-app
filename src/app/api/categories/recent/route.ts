import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase-queries";
import { getActiveAccountId } from "@/lib/account-context";

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (
      !accountId ||
      Number(request.nextUrl.searchParams.get("accountId")) !== accountId
    )
      return NextResponse.json(
        { error: "Your active budget changed. Reload to continue." },
        { status: 409 },
      );
    const { data, error } = await supabase.rpc("recent_budget_envelopes", {
      p_account_id: accountId,
    });
    if (error) throw error;
    return NextResponse.json(data ?? [], {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("Unable to load recent envelopes", error);
    return NextResponse.json(
      { error: "Could not load recently used envelopes" },
      { status: 500 },
    );
  }
}
