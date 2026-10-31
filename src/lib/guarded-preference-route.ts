import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "./supabase-queries";
export async function guardedPreferenceUpdate(
  kind: string,
  body: Record<string, unknown>,
  typeId?: string,
) {
  if (!("expectedRevision" in body) && !("expectedUserId" in body)) return null;
  const { expectedRevision, expectedUserId, ...patch } = body;
  const { supabase, user } = await getAuthenticatedUser();
  if (expectedUserId !== user.id)
    return NextResponse.json(
      { error: "Your signed-in account changed. Reload before saving." },
      { status: 409 },
    );
  if (
    expectedRevision !== null &&
    (typeof expectedRevision !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(expectedRevision))
  )
    return NextResponse.json(
      { error: "Reload these settings before saving safely." },
      { status: 400 },
    );
  const { data, error } = await supabase.rpc("save_personal_preferences", {
    p_kind: kind,
    p_revision: expectedRevision,
    p_patch: patch,
    p_type_id: typeId ?? null,
  });
  if (error) {
    if (["22023", "22P02", "23503"].includes(error.code))
      return NextResponse.json(
        { error: "Check these settings and try again." },
        { status: 400 },
      );
    throw error;
  }
  if (data.status === "conflict")
    return NextResponse.json(
      {
        error:
          "These settings changed elsewhere. Review the latest saved values before trying again.",
        code: "STALE_RECORD",
        latest: data.latest,
      },
      { status: 409 },
    );
  return NextResponse.json({ ...data.record, userId: user.id, success: true });
}
