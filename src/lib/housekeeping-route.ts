import { NextResponse } from "next/server";
import { checkWriteAccess } from "@/lib/api-helpers";
import { getActiveAccountId } from "@/lib/account-context";
import { getAuthenticatedUser } from "@/lib/supabase-queries";
import {
  requirePremiumSubscription,
  PremiumRequiredError,
} from "@/lib/subscription-utils";
import {
  envelopeHousekeepingSchema,
  goalHousekeepingSchema,
} from "./housekeeping";
export async function housekeepingWrite(
  request: Request,
  kind: "envelopes" | "goal",
) {
  try {
    const access = await checkWriteAccess();
    if (access) return access;
    const input = await request.json().catch(() => null);
    const parsed = (
      kind === "goal" ? goalHousekeepingSchema : envelopeHousekeepingSchema
    ).safeParse(input);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Check the selection and try again." },
        { status: 400 },
      );
    const { expectedBudgetId, operationId, command } = parsed.data;
    const budgetId = await getActiveAccountId();
    if (budgetId !== expectedBudgetId)
      return NextResponse.json(
        {
          error:
            "The active budget changed. Close this dialog and reopen it in the right budget.",
          code: "BUDGET_CHANGED",
        },
        { status: 409 },
      );
    if (kind === "goal") await requirePremiumSubscription(budgetId);
    const { supabase } = await getAuthenticatedUser();
    const { data, error } = await supabase.rpc(
      kind === "goal" ? "manage_goal" : "manage_envelopes",
      {
        p_budget_id: budgetId,
        p_operation_id: operationId,
        p_command: command,
      },
    );
    if (error) {
      if (error.code === "42501")
        return NextResponse.json(
          { error: "You no longer have edit access." },
          { status: 403 },
        );
      if (error.code === "22023")
        return NextResponse.json({ error: error.message }, { status: 400 });
      if (
        ["22P02", "22003", "23503", "23514", "23505", "23502"].includes(
          error.code,
        )
      )
        return NextResponse.json(
          {
            error:
              "Nothing was changed. A record is unavailable or still in use. Refresh the details and review again.",
          },
          { status: 400 },
        );
      throw error;
    }
    if (data.status === "conflict")
      return NextResponse.json(
        {
          error:
            "Nothing was changed. These records changed elsewhere. Review the latest details before saving.",
          code: "STALE_RECORD",
        },
        { status: 409 },
      );
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof PremiumRequiredError)
      return NextResponse.json({ error: error.message }, { status: 403 });
    console.error("Housekeeping command failed", error);
    return NextResponse.json(
      {
        error:
          "Could not confirm the change. Retry to safely check the same operation.",
      },
      { status: 500 },
    );
  }
}
