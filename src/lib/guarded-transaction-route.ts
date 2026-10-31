import { NextResponse } from "next/server";
import { getActiveAccountId } from "./account-context";
import { getAuthenticatedUser } from "./supabase-queries";
import { scheduleCategoryOverBudgetCheck } from "./budget/budget-alert-check";
const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export async function guardedTransactionUpdate(
  id: number | null,
  body: unknown,
  remove = false,
) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const { expectedBudgetId, expectedRevision, operationId, ...patch } =
    body as Record<string, unknown>;
  if (
    !("expectedBudgetId" in body) &&
    !("expectedRevision" in body) &&
    !("operationId" in body)
  )
    return null;
  if (
    !Number.isSafeInteger(expectedBudgetId) ||
    (id !== null &&
      (typeof expectedRevision !== "string" || !uuid.test(expectedRevision))) ||
    (id === null &&
      (typeof operationId !== "string" || !uuid.test(operationId))) ||
    (operationId !== undefined &&
      (typeof operationId !== "string" || !uuid.test(operationId)))
  )
    return NextResponse.json(
      {
        error: "Reload this transaction before saving.",
        code: "INVALID_REVISION",
      },
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
  if (
    id === null &&
    typeof patch.description === "string" &&
    !patch.merchant_group_id
  ) {
    const { getOrCreateMerchantGroup } = await import("./db/merchant-groups");
    patch.merchant_group_id =
      (await getOrCreateMerchantGroup(patch.description, true)).group?.id ??
      null;
  }
  const { data, error } = await supabase.rpc("save_transaction_command", {
    p_budget_id: budgetId,
    p_id: id,
    p_revision: expectedRevision ?? null,
    p_patch: patch,
    p_delete: remove,
    p_operation_id: operationId ?? null,
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
            error.code === "22023"
              ? error.message
              : "Check the transaction details and linked records.",
        },
        { status: 400 },
      );
    throw error;
  }
  if (data.status === "missing")
    return NextResponse.json(
      {
        error: "This transaction is no longer available.",
        code: "RECORD_MISSING",
      },
      { status: 404 },
    );
  if (data.status === "conflict")
    return NextResponse.json(
      {
        error:
          "This transaction changed elsewhere. Review the latest saved details before saving.",
        code: "STALE_RECORD",
        latest: data.latest,
      },
      { status: 409 },
    );
  try {
    if (!remove && !data.record.is_historical)
      scheduleCategoryOverBudgetCheck(
        budgetId!,
        data.record.splits.map((s: { category_id: number }) => s.category_id),
      );
  } catch (error) {
    console.error("Post-save transaction notification failed", error);
  }
  return NextResponse.json(data.record, { status: id === null ? 201 : 200 });
}
