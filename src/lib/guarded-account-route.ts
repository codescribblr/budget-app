import { NextResponse } from "next/server";
import { getActiveAccountId } from "./account-context";
import { getAuthenticatedUser } from "./supabase-queries";
import { createNetWorthSnapshot } from "./audit/account-balance-audit";
import { scheduleLowBalanceCheck } from "./budget/budget-alert-check";

/** Null means an existing, unversioned client: preserve its current API contract. */
export async function guardedAccountUpdate(kind: "account" | "card", id: number, body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return NextResponse.json({ error: "Invalid account update" }, { status: 400 });
  const { expectedRevision, expectedBudgetId, ...patch } = body as Record<string, unknown>;
  if (!("expectedRevision" in body) && !("expectedBudgetId" in body)) return null;
  if (typeof expectedRevision !== "string" || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(expectedRevision) ||
      !Number.isSafeInteger(expectedBudgetId) || Number(expectedBudgetId) <= 0)
    return NextResponse.json({ error: "Refresh this account before saving.", code: "INVALID_REVISION" }, { status: 400 });
  const active = await getActiveAccountId();
  if (active !== expectedBudgetId)
    return NextResponse.json({ error: "The active budget changed. Reload before saving.", code: "BUDGET_CHANGED" }, { status: 409 });
  const { supabase } = await getAuthenticatedUser();
  const { data, error } = await supabase.rpc("save_guarded_account", {
    p_budget_id: active, p_kind: kind, p_id: id, p_revision: expectedRevision, p_patch: patch,
  });
  if (error) {
    if (error.code === "42501") return NextResponse.json({ error: "You no longer have edit access." }, { status: 403 });
    if (["22023", "22P02", "22003", "22007", "22008", "23502", "23514"].includes(error.code))
      return NextResponse.json({ error: "Check the account details and amounts." }, { status: 400 });
    throw error;
  }
  if (data.status === "missing") return NextResponse.json({ error: "This account is no longer available.", code: "RECORD_MISSING" }, { status: 404 });
  if (data.status === "conflict") return NextResponse.json({
    error: "This account changed elsewhere. Review the latest details before saving.", code: "STALE_RECORD", latest: data.latest,
  }, { status: 409 });
  // Financial data and its audit are already committed. Ancillary failures must
  // never be reported as a failed save (which could cause a duplicate retry).
  try {
    await createNetWorthSnapshot();
    if (kind === "account" && data.previous.balance !== data.record.balance)
      scheduleLowBalanceCheck(active!, id, data.previous.balance, data.record.balance);
  } catch (error) { console.error("Post-save account refresh failed", error); }
  return NextResponse.json(data.record);
}
