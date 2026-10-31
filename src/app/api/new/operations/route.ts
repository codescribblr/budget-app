import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase-queries";
import { getActiveAccountId } from "@/lib/account-context";
export async function POST(request: Request) {
  try {
    const { operationId, expectedBudgetId } = await request.json();
    const budgetId = await getActiveAccountId();
    if (budgetId !== expectedBudgetId)
      return NextResponse.json(
        { error: "Select the original budget before checking this save." },
        { status: 409 },
      );
    if (
      typeof operationId !== "string" ||
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(operationId)
    )
      return NextResponse.json(
        { error: "Invalid operation." },
        { status: 400 },
      );
    const { supabase } = await getAuthenticatedUser();
    const { data, error } = await supabase.rpc("resolve_budget_operation", {
      p_budget_id: budgetId,
      p_operation_id: operationId,
    });
    if (error)
      return NextResponse.json(
        { error: "Could not check this save. Reconnect and try again." },
        { status: error.code === "42501" ? 403 : 500 },
      );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Could not check this save." },
      { status: 500 },
    );
  }
}
