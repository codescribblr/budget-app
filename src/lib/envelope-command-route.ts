import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getActiveAccountId } from "./account-context";
import { getAuthenticatedUser } from "./supabase-queries";
import { checkWriteAccess } from "./api-helpers";

const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export async function envelopeCommand(request: Request, kind: string) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid money command" },
      { status: 400 },
    );
  }
  try {
    return await executeEnvelopeCommand(body, kind);
  } catch (error) {
    console.error("Envelope command failed", error);
    return NextResponse.json(
      {
        error:
          "Could not confirm this change. Check its outcome before submitting another change.",
      },
      { status: 500 },
    );
  }
}
export async function executeEnvelopeCommand(
  body: Record<string, unknown>,
  kind: string,
) {
  const access = await checkWriteAccess();
  if (access) return access;
  const budgetId = await getActiveAccountId();
  if (!budgetId)
    return NextResponse.json({ error: "No active budget" }, { status: 403 });
  if (!body || typeof body !== "object" || Array.isArray(body))
    return NextResponse.json(
      { error: "Invalid money command" },
      { status: 400 },
    );
  const {
    expectedBudgetId,
    operationId,
    expectedRevisions,
    expectedAvailable,
    expectedBalance,
  } = body;
  const guarded = expectedBudgetId !== undefined || operationId !== undefined;
  if (
    guarded &&
    (!Number.isSafeInteger(expectedBudgetId) ||
      typeof operationId !== "string" ||
      !uuid.test(operationId))
  )
    return NextResponse.json(
      { error: "Refresh before saving this change.", code: "INVALID_REVISION" },
      { status: 400 },
    );
  if (guarded && expectedBudgetId !== budgetId)
    return NextResponse.json(
      {
        error: "The active budget changed. Reload before saving.",
        code: "BUDGET_CHANGED",
      },
      { status: 409 },
    );
  const command: Record<string, unknown> = { kind };
  for (const [key, value] of Object.entries({
    expectedRevisions,
    expectedAvailable,
    expectedBalance,
  }))
    if (value !== undefined) command[key] = value;
  if (kind === "allocate") {
    command.allocations = body.allocations ?? [
      { categoryId: body.categoryId, amount: body.amount },
    ];
    command.month = body.month ?? `${new Date().toISOString().slice(0, 7)}-01`;
    if (!body.allocations) command.source = "manual";
    if (body.bufferWithdrawAmount != null)
      command.bufferWithdrawAmount = body.bufferWithdrawAmount;
  } else if (kind === "transfer") {
    Object.assign(command, {
      categoryId: body.fromCategoryId,
      toCategoryId: body.toCategoryId,
      amount: body.amount,
    });
  } else
    Object.assign(command, {
      amount: body.amount,
      ...(body.categoryId ? { categoryId: body.categoryId } : {}),
    });
  if (
    kind.startsWith("buffer-") &&
    (typeof body.amount !== "number" ||
      !Number.isFinite(body.amount) ||
      body.amount <= 0 ||
      body.amount > 99999999.99 ||
      Math.abs(body.amount * 100 - Math.round(body.amount * 100)) > 0.000001)
  )
    return NextResponse.json(
      { error: "Enter a positive amount with at most two decimal places." },
      { status: 400 },
    );
  const { supabase } = await getAuthenticatedUser();
  const { data, error } = await supabase.rpc("run_envelope_command", {
    p_budget_id: budgetId,
    p_operation_id: operationId ?? randomUUID(),
    p_command: command,
  });
  if (error) {
    if (error.message === "Income Buffer is not enabled.")
      return NextResponse.json({ error: error.message }, { status: 403 });
    if (error.code === "42501")
      return NextResponse.json(
        { error: "You no longer have edit access." },
        { status: 403 },
      );
    if (
      ["22023", "22P02", "22003", "22007", "22008", "23502", "23514"].includes(
        error.code,
      )
    )
      return NextResponse.json(
        {
          error:
            error.code === "22023"
              ? error.message
              : "Check the amounts, envelopes and funding month.",
        },
        { status: 400 },
      );
    throw error;
  }
  if (data.status === "missing")
    return NextResponse.json(
      { error: "An envelope is no longer available.", code: "RECORD_MISSING" },
      { status: 404 },
    );
  if (data.status === "conflict")
    return NextResponse.json(
      { error: data.error, code: "STALE_RECORD", latest: data.latest },
      { status: 409 },
    );
  return NextResponse.json(data.result);
}
