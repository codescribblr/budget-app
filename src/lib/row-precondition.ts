import { NextResponse } from "next/server";
/** Optional for classic callers. Versioned callers must supply both scope and revision. */
export function rowPrecondition(
  body: Record<string, unknown>,
  budgetId: number | null,
) {
  if (!("expectedRevision" in body) && !("expectedBudgetId" in body))
    return { revision: undefined, response: null };
  if (body.expectedBudgetId !== budgetId)
    return {
      revision: undefined,
      response: NextResponse.json(
        {
          error: "The active budget changed. Reload before saving.",
          code: "BUDGET_CHANGED",
        },
        { status: 409 },
      ),
    };
  if (
    typeof body.expectedRevision !== "string" ||
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.expectedRevision)
  )
    return {
      revision: undefined,
      response: NextResponse.json(
        {
          error: "Reload this record before saving safely.",
          code: "INVALID_REVISION",
        },
        { status: 400 },
      ),
    };
  return { revision: body.expectedRevision, response: null };
}
export function staleRowResponse() {
  return NextResponse.json(
    {
      error:
        "This record changed or was removed elsewhere. Your entry was not saved. Review the latest saved details before trying again.",
      code: "STALE_RECORD",
    },
    { status: 409 },
  );
}
export async function optionalDeleteBody(
  request: Request,
): Promise<Record<string, unknown>> {
  const text = await request.text();
  return text ? JSON.parse(text) : {};
}
