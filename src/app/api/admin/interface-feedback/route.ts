import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }
  const { data, error } = await createServiceRoleClient()
    .from("interface_feedback")
    .select("id, account_id, page_path, kind, comment, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error)
    return NextResponse.json(
      { error: "Unable to load interface feedback." },
      { status: 500 },
    );
  return NextResponse.json(data);
}
