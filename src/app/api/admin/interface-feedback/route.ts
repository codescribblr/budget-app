import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }
  const feedbackId = new URL(request.url).searchParams.get("feedback");
  if (feedbackId !== null && !z.uuid().safeParse(feedbackId).success)
    return NextResponse.json(
      { error: "Invalid feedback ID." },
      { status: 400 },
    );
  let query = createServiceRoleClient()
    .from("interface_feedback")
    .select("id, account_id, page_path, kind, comment, created_at")
    .order("created_at", { ascending: false });
  query = feedbackId ? query.eq("id", feedbackId) : query.limit(200);
  const { data, error } = await query;
  if (error)
    return NextResponse.json(
      { error: "Unable to load interface feedback." },
      { status: 500 },
    );
  return NextResponse.json(data);
}
