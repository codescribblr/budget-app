import { NextResponse } from "next/server";
import { getActiveAccountId } from "@/lib/account-context";
import { checkWriteAccess } from "@/lib/api-helpers";
import { getNonCashAssetById } from "@/lib/supabase-queries";
import {
  getRentCastIntegrationRowForAccountMember,
  getRentCastIntegrationSupabaseForSync,
} from "@/lib/integrations/rentcast/access";
import {
  syncRentCastAsset,
  toPublicRentCastIntegration,
} from "@/lib/integrations/rentcast/sync";
import type { RentCastAssetFields } from "@/lib/integrations/rentcast/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const text = await request.text();
    let body: Record<string, unknown> | null = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      return NextResponse.json(
        { error: "Invalid sync request" },
        { status: 400 },
      );
    }
    const { id } = await params;
    const assetId = parseInt(id, 10);

    if (Number.isNaN(assetId)) {
      return NextResponse.json({ error: "Invalid asset ID" }, { status: 400 });
    }

    const asset = await getNonCashAssetById(assetId);
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    if (asset.asset_type !== "real_estate") {
      return NextResponse.json(
        { error: "RentCast sync is only available for real estate assets" },
        { status: 400 },
      );
    }

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: "No active account" }, { status: 400 });
    }

    if (
      body &&
      (body.expectedBudgetId !== accountId ||
        body.expectedRevision !== asset.revision)
    )
      return NextResponse.json(
        {
          error:
            "The property or active budget changed. Review the latest details before requesting a valuation.",
          code: "STALE_RECORD",
          latest: asset,
        },
        { status: 409 },
      );
    const supabase = await getRentCastIntegrationSupabaseForSync(accountId);
    if (!supabase) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: scopedAsset } = await supabase
      .from("non_cash_assets")
      .select("id")
      .eq("id", assetId)
      .eq("account_id", accountId)
      .maybeSingle();
    if (!scopedAsset)
      return NextResponse.json(
        { error: "Property not available in this budget." },
        { status: 404 },
      );
    const integration =
      await getRentCastIntegrationRowForAccountMember(accountId);

    if (!integration?.is_enabled) {
      return NextResponse.json(
        { error: "RentCast integration is not enabled" },
        { status: 400 },
      );
    }

    const result = await syncRentCastAsset(supabase, accountId, {
      ...asset,
      account_id: accountId,
      asset_type: "real_estate",
    } as RentCastAssetFields);
    const refreshedIntegration =
      await getRentCastIntegrationRowForAccountMember(accountId);
    const refreshedAsset = await getNonCashAssetById(assetId);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "RentCast sync failed",
          integration: toPublicRentCastIntegration(refreshedIntegration),
          asset: refreshedAsset,
        },
        { status: result.skipped ? 429 : 400 },
      );
    }

    return NextResponse.json({
      success: true,
      result,
      integration: toPublicRentCastIntegration(refreshedIntegration),
      asset: refreshedAsset,
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error syncing RentCast asset value:", error);
    return NextResponse.json(
      { error: "Failed to sync RentCast value" },
      { status: 500 },
    );
  }
}
