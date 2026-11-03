import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt, encrypt } from "@/lib/encryption";
import { computeNetWorthBreakdown } from "@/lib/net-worth";
import {
  DEFAULT_RENTCAST_MONTHLY_LIMIT,
  RentCastIntegrationConfig,
  RentCastIntegrationError,
  RentCastRateLimitError,
  RentCastSyncResult,
  type RentCastAssetFields,
  type RentCastValuePreference,
  type RentCastValueEstimateResponse,
} from "./types";
import { fetchRentCastValueEstimate } from "./client";
import { validateRentCastAssetReadiness } from "./validation";

/**
 * Resolve which dollar amount to store from a RentCast estimate based on user preference.
 * Falls back to estimate when low/high is missing.
 */
export function resolveRentCastStoredValue(
  estimate: Pick<
    RentCastValueEstimateResponse,
    "price" | "priceRangeLow" | "priceRangeHigh"
  >,
  preference: RentCastValuePreference | null | undefined,
): { value: number; appliedPreference: RentCastValuePreference } {
  const pref =
    preference === "low" || preference === "high" ? preference : "estimate";

  if (pref === "low" && estimate.priceRangeLow != null) {
    return { value: Number(estimate.priceRangeLow), appliedPreference: "low" };
  }
  if (pref === "high" && estimate.priceRangeHigh != null) {
    return {
      value: Number(estimate.priceRangeHigh),
      appliedPreference: "high",
    };
  }
  return { value: Number(estimate.price), appliedPreference: "estimate" };
}

function wasSyncedThisUtcMonth(lastSyncAt: string | null | undefined): boolean {
  if (!lastSyncAt) return false;
  const synced = new Date(lastSyncAt);
  if (Number.isNaN(synced.getTime())) return false;
  const now = new Date();
  return (
    synced.getUTCFullYear() === now.getUTCFullYear() &&
    synced.getUTCMonth() === now.getUTCMonth()
  );
}

interface IntegrationRow {
  revision?: string;
  id: number;
  account_id: number;
  integration_type: "rentcast";
  is_enabled: boolean;
  encrypted_api_key: string | null;
  api_key_hint: string | null;
  config: RentCastIntegrationConfig | null;
  requests_this_month: number;
  usage_month: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  created_at?: string;
  updated_at?: string;
}

function getCurrentUsageMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function normalizeConfig(
  config: RentCastIntegrationConfig | null | undefined,
): RentCastIntegrationConfig {
  return {
    enforce_monthly_limit: config?.enforce_monthly_limit ?? true,
    monthly_request_limit:
      config?.monthly_request_limit ?? DEFAULT_RENTCAST_MONTHLY_LIMIT,
  };
}

export function getEffectiveRequestCount(
  row: Pick<IntegrationRow, "requests_this_month" | "usage_month">,
): number {
  const currentMonth = getCurrentUsageMonth();
  if (row.usage_month !== currentMonth) {
    return 0;
  }
  return row.requests_this_month ?? 0;
}

export function isMonthlyLimitReached(row: IntegrationRow): boolean {
  const config = normalizeConfig(row.config);
  if (!config.enforce_monthly_limit) {
    return false;
  }
  return getEffectiveRequestCount(row) >= config.monthly_request_limit;
}

export function decryptIntegrationApiKey(
  row: Pick<IntegrationRow, "encrypted_api_key">,
): string | null {
  if (!row.encrypted_api_key) return null;
  try {
    return decrypt(row.encrypted_api_key);
  } catch (error) {
    console.error("Failed to decrypt RentCast API key:", error);
    return null;
  }
}

export async function getRentCastIntegrationRow(
  supabase: SupabaseClient,
  accountId: number,
): Promise<IntegrationRow | null> {
  const { data, error } = await supabase
    .from("integration_settings")
    .select("*")
    .eq("account_id", accountId)
    .eq("integration_type", "rentcast")
    .maybeSingle();

  if (error) throw error;
  return data as IntegrationRow | null;
}

async function reserveRentCastRequest(
  supabase: SupabaseClient,
  integration: IntegrationRow,
): Promise<IntegrationRow> {
  const { data, error } = await supabase.rpc("reserve_rentcast_request", {
    p_integration_id: integration.id,
  });
  if (error?.code === "P0001") throw new RentCastRateLimitError();
  if (error) throw error;
  return data as IntegrationRow;
}

async function createNetWorthSnapshotForAccount(
  supabase: SupabaseClient,
  accountId: number,
): Promise<void> {
  const { data: accounts } = await supabase
    .from("accounts")
    .select("balance, include_in_totals")
    .eq("account_id", accountId);

  const { data: creditCards } = await supabase
    .from("credit_cards")
    .select("current_balance")
    .eq("account_id", accountId);

  const { data: loans } = await supabase
    .from("loans")
    .select("balance, include_in_net_worth")
    .eq("account_id", accountId);

  const { data: assets } = await supabase
    .from("non_cash_assets")
    .select("current_value")
    .eq("account_id", accountId);

  const { totalAccounts, totalCreditCards, totalLoans, totalAssets, netWorth } =
    computeNetWorthBreakdown(
      accounts || [],
      creditCards || [],
      loans || [],
      assets || [],
    );

  const today = new Date().toISOString().split("T")[0];

  await supabase.from("net_worth_snapshots").upsert(
    {
      budget_account_id: accountId,
      snapshot_date: today,
      total_accounts: totalAccounts,
      total_credit_cards: totalCreditCards,
      total_loans: totalLoans,
      total_assets: totalAssets,
      net_worth: netWorth,
    },
    { onConflict: "budget_account_id,snapshot_date" },
  );
}

export async function syncRentCastAsset(
  supabase: SupabaseClient,
  accountId: number,
  asset: RentCastAssetFields,
  options?: { skipIfLimitReached?: boolean; skipIfSyncedThisMonth?: boolean },
): Promise<RentCastSyncResult> {
  if (!asset.rentcast_enabled) {
    return {
      success: false,
      skipped: true,
      error: "RentCast tracking is disabled for this asset",
    };
  }

  if (
    options?.skipIfSyncedThisMonth &&
    wasSyncedThisUtcMonth(asset.rentcast_last_sync_at)
  ) {
    return {
      success: false,
      skipped: true,
      error: "Already synced this month",
    };
  }

  const readiness = validateRentCastAssetReadiness(asset);
  if (!readiness.ready) {
    return {
      success: false,
      error: readiness.messages.join(" "),
    };
  }

  const integration = await getRentCastIntegrationRow(supabase, accountId);
  if (!integration?.is_enabled) {
    return { success: false, error: "RentCast integration is not enabled" };
  }

  if (options?.skipIfLimitReached && isMonthlyLimitReached(integration)) {
    return {
      success: false,
      skipped: true,
      error: "Monthly RentCast API request limit reached",
    };
  }

  const apiKey = decryptIntegrationApiKey(integration);
  if (!apiKey) {
    return { success: false, error: "RentCast API key is missing or invalid" };
  }

  let updatedIntegration = integration;
  try {
    updatedIntegration = await reserveRentCastRequest(supabase, integration);
  } catch (error) {
    if (error instanceof RentCastRateLimitError) {
      await supabase
        .from("integration_settings")
        .update({
          last_error: error.message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);
      return { success: false, error: error.message };
    }
    throw error;
  }

  try {
    const estimate = await fetchRentCastValueEstimate(apiKey, asset);
    const { data: committed, error: commitError } = await supabase.rpc(
      "apply_rentcast_estimate",
      {
        p_budget_id: accountId,
        p_asset_id: asset.id,
        p_revision: asset.revision,
        p_estimate: estimate,
      },
    );
    if (commitError) throw commitError;
    if (committed?.status !== "saved")
      return {
        success: false,
        error:
          "This property changed while the estimate was loading. The newer details were kept. Review the property before requesting another update.",
      };
    const oldValue = Number(committed.oldValue),
      newValue = Number(committed.newValue);
    // The valuation, selected value, and audit are committed together. Snapshot failures
    // must not report a failed sync and invite another provider request.
    if (Math.abs(newValue - oldValue) >= 0.01) {
      try {
        await createNetWorthSnapshotForAccount(supabase, accountId);
      } catch (error) {
        console.error("Post-valuation snapshot failed", error);
      }
    }

    await supabase
      .from("integration_settings")
      .update({
        last_sync_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updatedIntegration.id);

    return {
      success: true,
      estimatedValue: Number(estimate.price),
      oldValue,
      newValue,
    };
  } catch (error: any) {
    const message = error?.message || "RentCast sync failed";

    await supabase
      .from("non_cash_assets")
      .update({
        rentcast_last_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", asset.id)
      .eq("account_id", accountId)
      .eq("revision", asset.revision);

    await supabase
      .from("integration_settings")
      .update({
        last_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updatedIntegration.id);

    return { success: false, error: message };
  }
}

export async function syncAllRentCastAssetsForAccount(
  supabase: SupabaseClient,
  accountId: number,
): Promise<{
  synced: number;
  skipped: number;
  failed: number;
  errors: string[];
}> {
  const integration = await getRentCastIntegrationRow(supabase, accountId);
  if (!integration?.is_enabled) {
    return { synced: 0, skipped: 0, failed: 0, errors: [] };
  }

  const { data: assets, error } = await supabase
    .from("non_cash_assets")
    .select(
      "id, revision, account_id, name, asset_type, address, current_value, rentcast_enabled, property_type, bedrooms, bathrooms, square_footage, rentcast_last_sync_at, rentcast_last_error, rentcast_value_preference",
    )
    .eq("account_id", accountId)
    .eq("asset_type", "real_estate")
    .eq("rentcast_enabled", true);

  if (error) throw error;

  let synced = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const asset of assets || []) {
    if (isMonthlyLimitReached(integration)) {
      skipped += 1;
      errors.push("Monthly RentCast API request limit reached");
      break;
    }

    const result = await syncRentCastAsset(
      supabase,
      accountId,
      asset as RentCastAssetFields,
      {
        skipIfLimitReached: true,
        skipIfSyncedThisMonth: true,
      },
    );

    if (result.success) {
      synced += 1;
    } else if (result.skipped) {
      skipped += 1;
      if (result.error) errors.push(result.error);
    } else {
      failed += 1;
      if (result.error) errors.push(`${asset.name}: ${result.error}`);
    }

    const refreshedIntegration = await getRentCastIntegrationRow(
      supabase,
      accountId,
    );
    if (refreshedIntegration) {
      Object.assign(integration, refreshedIntegration);
    }
  }

  return { synced, skipped, failed, errors };
}

export function toPublicRentCastIntegration(row: IntegrationRow | null): Omit<
  import("./types").RentCastIntegrationSettings,
  "id" | "account_id" | "created_at" | "updated_at"
> & {
  id?: number;
  account_id?: number;
  created_at?: string;
  updated_at?: string;
} {
  const config = normalizeConfig(row?.config ?? undefined);
  const effectiveCount = row ? getEffectiveRequestCount(row) : 0;

  return {
    revision: row?.revision ?? null,
    id: row?.id,
    account_id: row?.account_id,
    integration_type: "rentcast",
    is_enabled: row?.is_enabled ?? false,
    has_api_key: Boolean(row?.encrypted_api_key),
    api_key_hint: row?.api_key_hint ?? null,
    config,
    requests_this_month: effectiveCount,
    usage_month: row?.usage_month ?? getCurrentUsageMonth(),
    monthly_limit_reached:
      row != null &&
      config.enforce_monthly_limit &&
      effectiveCount >= config.monthly_request_limit,
    last_sync_at: row?.last_sync_at ?? null,
    last_error: row?.last_error ?? null,
    created_at: row?.created_at,
    updated_at: row?.updated_at,
  };
}

export function buildApiKeyHint(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length <= 4) return trimmed;
  return trimmed.slice(-4);
}

export function encryptIntegrationApiKey(apiKey: string): string {
  return encrypt(apiKey.trim());
}
