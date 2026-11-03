import { NextResponse } from "next/server";
import { getActiveAccountId } from "./account-context";
import { getAuthenticatedUser } from "./supabase-queries";

/** A queued row is the durable idempotency identity. Successful rows and their
 * queue receipts commit together; a later chunk can safely resume after a loss. */
export async function guardedImportApproval(body: Record<string, unknown>) {
  if (!("expectedBudgetId" in body)) return null;
  const budgetId = await getActiveAccountId();
  if (
    !Number.isSafeInteger(body.expectedBudgetId) ||
    body.expectedBudgetId !== budgetId
  )
    return NextResponse.json(
      {
        error:
          "The active budget changed. Reload this review before importing.",
        code: "BUDGET_CHANGED",
      },
      { status: 409 },
    );
  const items = body.transactions as Record<string, any>[];
  if (
    typeof body.batchId !== "string" ||
    !Array.isArray(items) ||
    !items.length ||
    items.length > 10000 ||
    items.some(
      (t) =>
        !/^queued-[1-9]\d*$/.test(t.id) ||
        !/^[0-9a-f-]{36}$/i.test(t.revision ?? ""),
    )
  )
    return NextResponse.json(
      {
        error: "Reload this batch before importing safely.",
        code: "INVALID_REVISION",
      },
      { status: 400 },
    );
  const { supabase } = await getAuthenticatedUser();
  const result = {
    imported: 0,
    skipped: 0,
    requested: items.length,
    skippedItems: [] as unknown[],
    errors: [] as string[],
    failures: [] as unknown[],
  };
  const { resolveMerchantGroupIdsForImport } = await import(
    "./db/merchant-groups"
  );
  const merchantGroups = await resolveMerchantGroupIdsForImport(
    items.map((t) => t.description || ""),
  );
  for (let offset = 0; offset < items.length; offset += 100) {
    const chunk = items.slice(offset, offset + 100).map((t, index) => ({
      id: t.id,
      queuedId: Number(t.id.slice(7)),
      expectedRevision: t.revision,
      requireCategoryReview: body.requireCategoryReview === true,
      forceImport: t.forceImport === true,
      patch: {
        merchant_group_id: merchantGroups[offset + index],
        date: t.date,
        description: t.description,
        transaction_type: t.transaction_type,
        total_amount: t.amount,
        is_historical: t.is_historical ?? false,
        account_id: t.account_id ?? null,
        credit_card_id: t.credit_card_id ?? null,
        splits: (t.splits ?? []).map(
          (s: { categoryId: number; amount: number }) => ({
            category_id: s.categoryId,
            amount: s.amount,
          }),
        ),
        tag_ids: t.tag_ids ?? [],
      },
    }));
    const { data, error } = await supabase.rpc("approve_import_chunk", {
      p_budget_id: budgetId,
      p_batch_id: body.batchId,
      p_items: chunk,
    });
    if (error) {
      if (error.code === "42501")
        return NextResponse.json(
          {
            error:
              "You no longer have edit access. Previously completed chunks remain imported.",
          },
          { status: 403 },
        );
      throw error;
    }
    result.imported += data.imported;
    result.skipped += data.skipped;
    result.skippedItems.push(...data.skippedItems);
    result.failures.push(...data.failures);
    result.errors.push(
      ...data.failures.map(
        (f: { description: string; error: string }) =>
          `${f.description}: ${f.error}`,
      ),
    );
  }
  if (result.imported > 0) {
    try {
      await supabase.rpc("finish_import_refresh", { p_budget_id: budgetId });
    } catch (error) {
      console.error("Import completion refresh unavailable", error);
    }
  }
  return NextResponse.json(result);
}
