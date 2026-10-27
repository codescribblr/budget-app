import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase-queries";
import { getActiveAccountId } from "@/lib/account-context";
import { checkinSteps } from "@/lib/checkins";
import {
  currentReviewItems,
  zonedCheckinPeriod,
  type CheckinScope,
} from "@/lib/checkin-persistence";

async function handle(request: NextRequest, save: boolean) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    const input = save
      ? await request.json()
      : Object.fromEntries(request.nextUrl.searchParams);
    if (!input || typeof input !== "object" || Array.isArray(input))
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    if (!accountId || Number(input.accountId) !== accountId)
      return NextResponse.json(
        { error: "Your active budget changed. Reload before continuing." },
        { status: 409 },
      );
    if (
      !["daily", "weekly", "monthly"].includes(input.cadence) ||
      typeof input.timeZone !== "string"
    )
      return NextResponse.json({ error: "Invalid check-in" }, { status: 400 });
    const now = new Date();
    let period: string;
    try {
      period = zonedCheckinPeriod(input.cadence, now, input.timeZone);
    } catch {
      return NextResponse.json({ error: "Invalid time zone" }, { status: 400 });
    }
    if (input.period !== period)
      return NextResponse.json(
        { error: "A new check-in period has started. Reload to continue." },
        { status: 409 },
      );
    const scope: CheckinScope = {
      userId: user.id,
      accountId,
      cadence: input.cadence,
      period,
      timeZone: input.timeZone,
      planning: input.planning === true,
    };
    const periodStart = scope.cadence === "monthly" ? `${period}-01` : period;
    let record;
    if (save) {
      const items = currentReviewItems(
        JSON.stringify(input.restore ?? {}),
        scope,
        now,
      );
      if (input.task !== undefined) {
        if (
          !checkinSteps(scope.cadence, true).some(
            (step) => step.key === input.task,
          )
        )
          return NextResponse.json(
            { error: "Invalid review step" },
            { status: 400 },
          );
        items[input.task] = now.toISOString();
      }
      if (!Object.keys(items).length)
        return NextResponse.json(
          { error: "No current review steps to save" },
          { status: 400 },
        );
      const { data, error } = await supabase.rpc("save_budget_checkin", {
        p_account_id: accountId,
        p_cadence: scope.cadence,
        p_period_start: periodStart,
        p_items: items,
        p_planning: scope.planning,
      });
      if (error) throw error;
      record = data;
    } else {
      const { data, error } = await supabase
        .from("budget_checkins")
        .select("items, completed_at")
        .eq("user_id", user.id)
        .eq("account_id", accountId)
        .eq("cadence", scope.cadence)
        .eq("period_start", periodStart)
        .maybeSingle();
      if (error) throw error;
      record = data;
    }
    return NextResponse.json(
      { items: record?.items ?? {}, completedAt: record?.completed_at ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    console.error("Unable to access check-in progress", error);
    return NextResponse.json(
      {
        error: "Your check-in could not be saved or loaded. Please try again.",
      },
      { status: 500 },
    );
  }
}
export const GET = (request: NextRequest) => handle(request, false);
export const POST = (request: NextRequest) => handle(request, true);
