import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase-queries";
import { getActiveAccountId } from "@/lib/account-context";
import { housekeepingWrite } from "@/lib/housekeeping-route";
export const POST = (request: Request) =>
  housekeepingWrite(request, "envelopes");
export async function GET() {
  try {
    const { supabase } = await getAuthenticatedUser();
    const budgetId = await getActiveAccountId();
    if (!budgetId)
      return NextResponse.json({ error: "Choose a budget." }, { status: 400 });
    const { data, error } = await supabase.rpc("envelope_housekeeping", {
      p_budget_id: budgetId,
    });
    if (error) throw error;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Could not load envelope details." },
      { status: 500 },
    );
  }
}
