import { NextResponse } from "next/server";
import { checkWriteAccess } from "@/lib/api-helpers";
import { getActiveAccountId } from "@/lib/account-context";
import { getAuthenticatedUser } from "@/lib/supabase-queries";
import { correctionRequestSchema } from "@/lib/transaction-corrections";
import { scheduleCategoryOverBudgetCheck } from "@/lib/budget/budget-alert-check";

export async function POST(request: Request) {
  try {
    const access = await checkWriteAccess();
    if (access) return access;
    const parsed = correctionRequestSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return NextResponse.json(
        { error: "Check the selected transactions and corrections." },
        { status: 400 },
      );
    const { expectedBudgetId, operationId, records, patch } = parsed.data;
    const budgetId = await getActiveAccountId();
    if (budgetId !== expectedBudgetId)
      return NextResponse.json(
        {
          error: "The active budget changed. Reload before saving.",
          code: "BUDGET_CHANGED",
        },
        { status: 409 },
      );
    const { supabase } = await getAuthenticatedUser();
    const { data, error } = await supabase.rpc("correct_transactions", {
      p_budget_id: budgetId,
      p_operation_id: operationId,
      p_records: records,
      p_patch: patch,
    });
    if (error) {
      if (error.code === "42501")
        return NextResponse.json(
          { error: "You no longer have edit access." },
          { status: 403 },
        );
      if (
        [
          "22023",
          "22P02",
          "22003",
          "22007",
          "22008",
          "23502",
          "23503",
          "23514",
        ].includes(error.code)
      )
        return NextResponse.json(
          {
            error:
              "Nothing was changed. Check the date, account and transaction details.",
          },
          { status: 400 },
        );
      throw error;
    }
    if (data.status === "conflict")
      return NextResponse.json(
        {
          error:
            "Nothing was changed. Some selected transactions were edited or removed elsewhere. Review the latest records before applying your corrections.",
          code: "STALE_RECORD",
          latest: data.latest,
        },
        { status: 409 },
      );
    try {
      scheduleCategoryOverBudgetCheck(budgetId, data.categoryIds);
    } catch (error) {
      console.error("Bulk correction notification failed", error);
    }
    return NextResponse.json({
      updated: data.updated,
      transactionIds: data.transactionIds,
    });
  } catch (error) {
    console.error("Bulk transaction correction failed", error);
    return NextResponse.json(
      {
        error:
          "Could not confirm the corrections. Retry to check and safely finish the same change.",
      },
      { status: 500 },
    );
  }
}
