"use client";
import { useState } from "react";
import Link from "next/link";
import { Building2, Pencil, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";
import type {
  NonCashAsset,
  RentCastIntegrationSettingsResponse,
  RentCastValuationSummary,
} from "@/lib/types";
import {
  RENTCAST_PROPERTY_TYPES,
  type RentCastValuePreference,
} from "@/lib/integrations/rentcast/types";
import { money, cents } from "@/lib/new-look";
import { Switch } from "@/components/ui/switch";
import { useBudgetResource } from "./use-budget-resource";
import { budgetRequest, useBudget } from "./budget-context";
import { guardedMetadata, useRecordGuard } from "./record-guard";
import { SetupDialog } from "./setup-dialog";
import { NativeSelect } from "./native-select";
import { SkeletonRegion } from "./skeleton-sections";
import { SkeletonLine } from "./home-skeleton";

type PropertyData = {
  integration: RentCastIntegrationSettingsResponse | null;
  valuation: RentCastValuationSummary | null;
};
const choices = [
  ["low", "Lower estimate"],
  ["estimate", "Central estimate"],
  ["high", "Higher estimate"],
] as const;
export function PropertyValuation({
  asset,
  canEdit,
  onManual,
}: {
  asset: NonCashAsset;
  canEdit: boolean;
  onManual: () => void;
}) {
  const { data: budget, refresh } = useBudget();
  const resource = useBudgetResource<PropertyData>(
    `/api/non-cash-assets/${asset.id}/rentcast`,
    ["planning", "settings"],
  );
  const [uncertain, setUncertain] = useState(false);
  const [editing, setEditing] = useState<NonCashAsset | null>(null);
  const [action, setAction] = useState<{
    kind: "sync" | "select";
    asset: NonCashAsset;
    valuation?: RentCastValuationSummary;
    preference?: RentCastValuePreference;
    value?: number;
  } | null>(null);
  const valuation = resource.data?.valuation;
  const integration = resource.data?.integration;
  const active = asset.rentcast_enabled && integration?.is_enabled;
  const changed =
    !!action &&
    (action.asset.revision !== asset.revision ||
      (action.kind === "select" && action.valuation?.id !== valuation?.id));
  async function updated() {
    resource.retry();
    await refresh().catch(() =>
      toast.error("Saved. Reload to refresh the property and net worth."),
    );
  }
  return (
    <section className="nl-panel nl-property-panel">
      <div className="nl-section-title">
        <div>
          <p className="nl-eyebrow">A value you can review</p>
          <h2 className="nl-icon-heading">
            <Building2 size={20} />
            Property & valuation
          </h2>
        </div>
        <button
          className="nl-secondary"
          disabled={!canEdit}
          onClick={() => setEditing(asset)}
        >
          <Pencil size={15} />
          Property details
        </button>
      </div>
      <div className="nl-property-address">
        <strong>{asset.address || "Add the property’s full address"}</strong>
        <p>
          {[
            asset.property_type,
            asset.bedrooms != null ? `${asset.bedrooms} beds` : null,
            asset.bathrooms != null ? `${asset.bathrooms} baths` : null,
            asset.square_footage != null
              ? `${asset.square_footage.toLocaleString()} sq ft`
              : null,
          ]
            .filter(Boolean)
            .join(" · ") ||
            "Property details help RentCast find a more relevant estimate."}
        </p>
      </div>
      <div className="nl-property-status">
        <span className="nl-tag">
          {active ? "Automatic value updates on" : "Manual value tracking"}
        </span>
        <span>
          {asset.rentcast_last_sync_at
            ? `Last fetched ${new Date(asset.rentcast_last_sync_at).toLocaleDateString(undefined, { dateStyle: "medium" })}`
            : "No successful RentCast update yet"}
        </span>
      </div>
      {!resource.data && !resource.error && (
        <SkeletonRegion label="Loading property valuation">
          <div className="nl-property-values">
            {[0, 1, 2].map((n) => (
              <div className="nl-value-skeleton" key={n}>
                <SkeletonLine width="65%" />
                <SkeletonLine width="85%" height={30} />
                <SkeletonLine width="75%" />
              </div>
            ))}
          </div>
        </SkeletonRegion>
      )}
      {resource.error && (
        <p className="nl-error" role="alert">
          {resource.error}{" "}
          <button className="nl-text-button" onClick={resource.retry}>
            Try again
          </button>
        </p>
      )}
      {resource.data && (
        <>
          {!integration?.is_enabled ? (
            <p className="nl-notice">
              Connect RentCast to request estimates. You can keep using your own
              recorded value.{" "}
              <Link href="/new/settings/integrations">
                Open property valuation settings →
              </Link>
            </p>
          ) : !asset.rentcast_enabled ? (
            <p className="nl-notice">
              RentCast is connected. Enable automatic valuations in Property
              details to request updates for this asset.
            </p>
          ) : (
            <p className="nl-muted">
              Monthly updates replace the recorded value using your chosen
              estimate ({asset.rentcast_value_preference || "estimate"}). To
              keep a manual appraisal or other value, turn automatic updates off
              in Property details.
            </p>
          )}
          {asset.rentcast_last_error && (
            <p className="nl-error" role="alert">
              Last update: {asset.rentcast_last_error}
            </p>
          )}
          {valuation ? (
            <>
              {valuation.subject_property?.formattedAddress && (
                <p className="nl-muted">
                  Estimate for{" "}
                  {String(valuation.subject_property.formattedAddress)}
                  {valuation.subject_property.yearBuilt
                    ? ` · built ${String(valuation.subject_property.yearBuilt)}`
                    : ""}
                  . Check that this is the property you intend to value.
                </p>
              )}
              <div className="nl-property-values">
                {choices.map(([pref, label]) => {
                  const amount =
                    pref === "low"
                      ? valuation.price_range_low
                      : pref === "high"
                        ? valuation.price_range_high
                        : valuation.estimated_value;
                  const selected =
                    amount != null &&
                    (asset.rentcast_value_preference || "estimate") === pref &&
                    cents(Number(amount)) === cents(asset.current_value);
                  return (
                    <button
                      key={pref}
                      type="button"
                      disabled={!canEdit || !!resource.error || amount == null}
                      aria-pressed={selected}
                      onClick={() => {
                        setUncertain(false);
                        setAction({
                          kind: "select",
                          asset,
                          valuation,
                          preference: pref,
                          value: Number(amount),
                        });
                      }}
                    >
                      <span>{label}</span>
                      <strong>
                        {amount == null ? "Unavailable" : money(Number(amount))}
                      </strong>
                      <small>
                        {selected ? (
                          <>
                            <Check size={13} />
                            Matches recorded value
                          </>
                        ) : (
                          "Review & use this value →"
                        )}
                      </small>
                    </button>
                  );
                })}
              </div>
              <p className="nl-muted">
                RentCast estimate fetched{" "}
                {new Date(valuation.fetched_at).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                })}
                . These are estimates, not an appraisal or a guaranteed sale
                price. The value you record contributes to net worth, never
                Available to save.
              </p>
              <details className="nl-property-comparables">
                <summary>
                  Comparable properties ({valuation.comparables?.length ?? 0})
                </summary>
                <p className="nl-muted">
                  Properties returned with this estimate. Listed prices are not
                  necessarily completed sale prices.
                </p>
                <div>
                  {(valuation.comparables ?? []).map((c, i) => (
                    <article key={String(c.id ?? i)}>
                      <div>
                        <strong>
                          {String(
                            c.formattedAddress ||
                              [c.city, c.state, c.zipCode]
                                .filter(Boolean)
                                .join(", ") ||
                              `Comparable ${i + 1}`,
                          )}
                        </strong>
                        <p>
                          {[
                            c.propertyType,
                            c.bedrooms != null ? `${c.bedrooms} beds` : null,
                            c.bathrooms != null ? `${c.bathrooms} baths` : null,
                            c.squareFootage != null
                              ? `${Number(c.squareFootage).toLocaleString()} sq ft`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <small>
                          {[
                            typeof c.distance === "number"
                              ? `${c.distance.toFixed(1)} miles away`
                              : null,
                            c.status,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </div>
                      <strong>
                        {typeof c.price === "number"
                          ? money(c.price)
                          : "Price unavailable"}
                      </strong>
                    </article>
                  ))}
                </div>
                {!valuation.comparables?.length && (
                  <p>No comparable properties were returned.</p>
                )}
              </details>
            </>
          ) : (
            <p className="nl-muted">
              No estimate saved yet. Start with your address and property
              details, then request a valuation or use your own estimate.
            </p>
          )}
          <div className="nl-property-actions">
            <button
              className="nl-primary"
              disabled={
                !canEdit ||
                !active ||
                !!resource.error ||
                integration?.monthly_limit_reached
              }
              onClick={() => {
                setUncertain(false);
                setAction({ kind: "sync", asset });
              }}
            >
              <RefreshCw size={16} />
              Refresh & update value
            </button>
            <button
              className="nl-secondary"
              disabled={!canEdit}
              onClick={onManual}
            >
              Enter my own value
            </button>
          </div>
          {integration?.is_enabled && (
            <p className="nl-muted">
              {integration.requests_this_month} RentCast requests this month
              {integration.config.enforce_monthly_limit
                ? ` · limit ${integration.config.monthly_request_limit}`
                : ""}
              .{" "}
              {integration.monthly_limit_reached
                ? "Monthly limit reached. Saved estimates are still available to choose."
                : "Choosing a saved estimate uses no API request."}
            </p>
          )}
        </>
      )}
      {editing && (
        <PropertyEditor
          asset={asset}
          original={editing}
          canEdit={canEdit}
          onClose={() => setEditing(null)}
          onSaved={updated}
        />
      )}
      {action && (
        <SetupDialog
          title={
            action.kind === "sync"
              ? "Refresh this property’s value?"
              : "Use this estimate for net worth?"
          }
          description={asset.name}
          dirty={false}
          allowUnchanged
          canEdit={canEdit && !changed && !resource.error && !uncertain}
          saveLabel={
            action.kind === "sync" ? "Fetch & update value" : "Use this value"
          }
          onClose={() => setAction(null)}
          onSave={async () => {
            if (!budget || changed)
              throw new Error("Review the latest property before continuing.");
            try {
              await budgetRequest(
                `/api/non-cash-assets/${asset.id}/rentcast/${action.kind === "sync" ? "sync" : "select-value"}`,
                {
                  ...guardedMetadata(
                    action.asset,
                    budget.identity.activeAccountId,
                  ),
                  ...(action.kind === "select"
                    ? {
                        preference: action.preference,
                        expectedValuationId: action.valuation?.id,
                      }
                    : {}),
                },
              );
            } catch (error) {
              resource.retry();
              if (action.kind === "sync") setUncertain(true);
              throw error;
            }
            toast.success("Property value updated.");
            await updated();
          }}
        >
          {uncertain && (
            <p className="nl-notice" role="alert">
              Close this dialog and review the saved value and request count
              before trying again. The request may have completed even if its
              response was interrupted.
            </p>
          )}
          {changed && (
            <p className="nl-notice">
              This property or estimate changed elsewhere. Close this review and
              choose again.
            </p>
          )}
          {action.kind === "sync" ? (
            <>
              <p>
                This uses one request from your RentCast connection and replaces
                the recorded value with the new{" "}
                {asset.rentcast_value_preference || "central"} estimate. Your
                net worth will update with it.
              </p>
              <p className="nl-muted">
                If the property changes while the estimate is being requested,
                the newer edits will be preserved.
              </p>
            </>
          ) : (
            <div className="nl-setup-preview">
              <span>Recorded property value</span>
              <strong>
                {money(asset.current_value)} → {money(action.value!)}
              </strong>
              <small>
                Net worth changes by{" "}
                {money(action.value! - asset.current_value)}.{" "}
                {asset.rentcast_enabled
                  ? "Future automatic updates will use this estimate preference."
                  : "Automatic updates remain off."}{" "}
                Account and envelope balances stay the same.
              </small>
            </div>
          )}
        </SetupDialog>
      )}
    </section>
  );
}
function PropertyEditor({
  asset,
  original,
  canEdit,
  onClose,
  onSaved,
}: {
  asset: NonCashAsset;
  original: NonCashAsset;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const guard = useRecordGuard(asset);
  const initial = {
    address: original.address ?? "",
    property_type: original.property_type ?? "",
    bedrooms: original.bedrooms == null ? "" : String(original.bedrooms),
    bathrooms: original.bathrooms == null ? "" : String(original.bathrooms),
    square_footage:
      original.square_footage == null ? "" : String(original.square_footage),
    rentcast_enabled: !!original.rentcast_enabled,
    rentcast_value_preference: original.rentcast_value_preference ?? "estimate",
  };
  const [draft, setDraft] = useState(initial);
  function number(value: string, integer = false) {
    if (!value.trim()) return null;
    const n = Number(value);
    if (
      !Number.isFinite(n) ||
      n < 0 ||
      n > (integer ? 99999999 : 999.9) ||
      (integer ? !Number.isInteger(n) : n !== Math.round(n * 10) / 10)
    )
      throw new Error(
        "Check the property dimensions. Use positive numbers, or leave them blank.",
      );
    return n;
  }
  return (
    <SetupDialog
      title="Property details & updates"
      description={original.name}
      dirty={JSON.stringify(draft) !== JSON.stringify(initial)}
      canEdit={canEdit}
      saveLabel="Save property details"
      onClose={onClose}
      onSave={async () => {
        if (
          draft.address.trim().length > 500 ||
          (draft.rentcast_enabled && !draft.address.trim())
        )
          throw new Error(
            "Enter the full street address, city, state, and ZIP for RentCast.",
          );
        await guard.save(
          {
            ...draft,
            address: draft.address.trim() || null,
            property_type: draft.property_type || null,
            bedrooms: number(draft.bedrooms),
            bathrooms: number(draft.bathrooms),
            square_footage: number(draft.square_footage, true),
          },
          (p) => budgetRequest(`/api/non-cash-assets/${asset.id}`, p, "PATCH"),
        );
        toast.success("Property details saved.");
        await onSaved();
      }}
    >
      {guard.notice}
      <label>
        Full property address
        <input
          value={draft.address}
          maxLength={500}
          placeholder="Street, city, state, ZIP"
          onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
        />
      </label>
      <label>
        Property type (optional)
        <NativeSelect
          value={draft.property_type}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              property_type: e.target.value as typeof d.property_type,
            }))
          }
        >
          <option value="">Let RentCast look it up</option>
          {RENTCAST_PROPERTY_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </NativeSelect>
      </label>
      <div className="nl-form-grid">
        {(
          [
            ["bedrooms", "Bedrooms"],
            ["bathrooms", "Bathrooms"],
            ["square_footage", "Square feet"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label} (optional)
            <input
              inputMode="decimal"
              value={draft[key]}
              onChange={(e) =>
                setDraft((d) => ({ ...d, [key]: e.target.value }))
              }
            />
          </label>
        ))}
      </div>
      <label className="nl-toggle-row">
        <Switch
          checked={draft.rentcast_enabled}
          onCheckedChange={(v) =>
            setDraft((d) => ({ ...d, rentcast_enabled: v }))
          }
        />
        <span>
          Use automatic RentCast valuations
          <small>
            Monthly updates replace this property’s recorded value and update
            net worth. Requires a connected RentCast account.
          </small>
        </span>
      </label>
      {draft.rentcast_enabled && (
        <label>
          Which estimate should automatic updates use?
          <NativeSelect
            value={draft.rentcast_value_preference}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                rentcast_value_preference: e.target
                  .value as RentCastValuePreference,
              }))
            }
          >
            {choices.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </NativeSelect>
        </label>
      )}
      <p className="nl-muted">
        Saving these details doesn’t request an estimate or change today’s
        value. Turn automatic updates off to maintain your own appraisal or
        estimate.
      </p>
    </SetupDialog>
  );
}
