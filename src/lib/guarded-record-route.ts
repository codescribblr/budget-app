import { NextResponse } from "next/server";
import { getActiveAccountId } from "./account-context";
import { getAuthenticatedUser } from "./supabase-queries";
import { createNetWorthSnapshot } from "./audit/account-balance-audit";

export async function guardedRecordUpdate(
  table: string,
  id: number,
  body: unknown,
  remove = false,
) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const { expectedRevision, expectedBudgetId, ...patch } = body as Record<
    string,
    unknown
  >;
  if (!("expectedRevision" in body) && !("expectedBudgetId" in body))
    return null;
  if (
    typeof expectedRevision !== "string" ||
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(expectedRevision) ||
    !Number.isSafeInteger(expectedBudgetId)
  )
    return NextResponse.json(
      { error: "Refresh this record before saving.", code: "INVALID_REVISION" },
      { status: 400 },
    );
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
  const { data, error } = await supabase.rpc("save_guarded_record", {
    p_budget_id: budgetId,
    p_table: table,
    p_id: id,
    p_revision: expectedRevision,
    p_patch: patch,
    p_delete: remove,
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
            remove && table === "non_cash_assets" && error.code === "23503"
              ? "A goal still uses this asset. Keep it and update its value, or remove the goal’s asset link before deleting it."
              : error.code === "22023"
                ? error.message
                : "Check the details and linked records.",
        },
        { status: 400 },
      );
    throw error;
  }
  if (data.status === "missing")
    return NextResponse.json(
      { error: "This record is no longer available.", code: "RECORD_MISSING" },
      { status: 404 },
    );
  if (data.status === "conflict")
    return NextResponse.json(
      {
        error:
          "This record changed elsewhere. Your edits are retained; review the latest saved details before saving.",
        code: "STALE_RECORD",
        latest: data.latest,
      },
      { status: 409 },
    );
  if (
    ["loans", "non_cash_assets", "accounts", "credit_cards"].includes(table)
  ) {
    try {
      await createNetWorthSnapshot();
    } catch (error) {
      console.error("Post-save snapshot failed", error);
    }
  }
  return NextResponse.json(data.record);
}

/** Old clients do not send a DELETE body. */
export async function guardedDelete(
  request: Request,
  table: string,
  id: number,
) {
  const text = await request.text();
  if (!text) return null;
  try {
    return await guardedRecordUpdate(table, id, JSON.parse(text), true);
  } catch (error) {
    if (error instanceof SyntaxError)
      return NextResponse.json(
        { error: "Invalid delete request" },
        { status: 400 },
      );
    throw error;
  }
}
