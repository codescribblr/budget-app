import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase-queries";
import { getActiveAccountId } from "@/lib/account-context";
import { notifyAdminsOfInterfaceFeedback } from "@/lib/notifications/interface-feedback";

export const maxDuration = 60;

const schema = z.object({
  id: z.uuid(),
  kind: z.enum(["suggestion", "problem", "missing", "positive"]),
  comment: z.string().trim().min(5).max(4000),
  page: z
    .string()
    .max(200)
    .regex(/^\/new(?:\/[a-z0-9/-]*)?$/),
});
export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return NextResponse.json(
        { error: "Enter 5–4,000 characters of feedback and a valid page." },
        { status: 400 },
      );
    const accountId = await getActiveAccountId();
    if (!accountId)
      return NextResponse.json(
        { error: "Select a budget account first." },
        { status: 400 },
      );
    const input = parsed.data;
    const { error } = await supabase.from("interface_feedback").insert({
      id: input.id,
      user_id: user.id,
      account_id: accountId,
      page_path: input.page,
      kind: input.kind,
      comment: input.comment,
    });
    if (error?.code === "23505") {
      const { data } = await supabase
        .from("interface_feedback")
        .select("id")
        .eq("id", input.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) return NextResponse.json({ saved: true });
    }
    if (error) {
      console.error("Interface feedback save failed:", error.code);
      return NextResponse.json(
        {
          error:
            "Feedback could not be saved. Your message is still here; please try again.",
        },
        { status: 503 },
      );
    }
    // Keep submission fast and successful even if an alert channel fails.
    // `after` keeps this work alive after the response on supported hosts.
    after(async () => {
      try {
        await notifyAdminsOfInterfaceFeedback({
          ...input,
          userId: user.id,
          submitterEmail: user.email,
          accountId,
        });
      } catch (error) {
        console.error("Interface feedback alerts failed:", input.id, error);
      }
    });
    return NextResponse.json({ saved: true }, { status: 201 });
  } catch (error) {
    const unauthorized =
      error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      {
        error: unauthorized
          ? "Please sign in again."
          : "Feedback could not be saved.",
      },
      { status: unauthorized ? 401 : 500 },
    );
  }
}
