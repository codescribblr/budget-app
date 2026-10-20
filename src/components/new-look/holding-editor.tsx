"use client";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { NON_CASH_ASSET_TYPE_OPTIONS } from "@/lib/non-cash-asset-types";
import {
  holdingDraft,
  prepareHolding,
  type Holding,
  type HoldingDraft,
  type HoldingKind,
} from "@/lib/long-term-planning";
import type { NonCashAsset } from "@/lib/types";
import { money, parseMoney } from "@/lib/new-look";
import { SetupDialog } from "./setup-dialog";
import { NativeSelect } from "./native-select";
export function HoldingEditor({
  kind,
  item,
  balanceOnly,
  assets,
  canEdit,
  onClose,
  onSave,
}: {
  kind: HoldingKind;
  item?: Holding;
  balanceOnly?: boolean;
  assets: NonCashAsset[];
  canEdit: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [initial] = useState(() => holdingDraft(item));
  const [draft, setDraft] = useState(initial);
  const loan = kind === "loans";
  const change = <K extends keyof HoldingDraft>(
    key: K,
    value: HoldingDraft[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));
  const number = parseMoney(draft.amount);
  const field = (
    key: keyof HoldingDraft,
    label: string,
    placeholder = "",
    type = "text",
  ) => (
    <label>
      {label}
      <input
        type={type}
        value={String(draft[key])}
        onChange={(e) => change(key, e.target.value as never)}
        placeholder={placeholder}
        inputMode={
          ["amount", "rate", "payment", "start", "returnRate"].includes(key)
            ? "decimal"
            : undefined
        }
      />
    </label>
  );
  return (
    <SetupDialog
      title={
        balanceOnly
          ? `Update ${item?.name}`
          : item
            ? `Edit ${item.name}`
            : loan
              ? "Add a loan"
              : "Add an investment or asset"
      }
      description={
        loan
          ? "Record what your lender shows. This does not send a payment or take money out of an envelope."
          : "Record the current account or asset value. This does not move money or change available to save."
      }
      dirty={JSON.stringify(initial) !== JSON.stringify(draft)}
      canEdit={canEdit}
      saveLabel={
        balanceOnly
          ? "Save recorded balance"
          : item
            ? "Save details"
            : loan
              ? "Add loan"
              : "Add asset"
      }
      onClose={onClose}
      onSave={async () => {
        const payload = prepareHolding(kind, draft, item, balanceOnly);
        if (Object.keys(payload).length) await onSave(payload);
      }}
    >
      {!balanceOnly &&
        field(
          "name",
          loan ? "Loan name" : "Investment or asset name",
          loan ? "e.g. Car loan" : "e.g. Retirement account",
        )}
      {!balanceOnly && !loan && (
        <label>
          What are you tracking?
          <NativeSelect
            value={draft.type}
            onChange={(e) =>
              change("type", e.target.value as NonCashAsset["asset_type"])
            }
          >
            {NON_CASH_ASSET_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </NativeSelect>
        </label>
      )}
      {field("amount", loan ? "Current amount owed" : "Current value", "0.00")}
      <div className="nl-setup-preview">
        <strong>
          {number === null
            ? "Enter the current amount above"
            : `${money(number)} ${loan ? "owed" : "recorded value"}`}
        </strong>
        <p>
          {loan
            ? "Loan balances track debt separately from your everyday budget. Record loan payments in the appropriate envelope when you import spending."
            : "A value change can include contributions, withdrawals, and market changes. It is not a measure of investment return."}
        </p>
      </div>
      {!balanceOnly && loan && (
        <>
          <div className="nl-form-grid">
            {field(
              "payment",
              "Minimum monthly payment (optional)",
              "e.g. 325.00",
            )}
            <label>
              Payment due day (optional)
              <NativeSelect
                value={draft.due}
                onChange={(e) => change("due", e.target.value)}
              >
                <option value="">Not specified</option>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </NativeSelect>
            </label>
          </div>
          <div className="nl-form-grid">
            {field("rate", "Annual interest rate % (optional)", "e.g. 5.25")}
            {field("institution", "Lender (optional)", "e.g. Credit union")}
          </div>
          <details className="nl-editor-details">
            <summary>Starting debt, dates & net worth</summary>
            <div className="nl-form-grid">
              {field(
                "start",
                "Original loan amount (optional)",
                "Used for debt reduction",
              )}
              {field("opened", "Opened (optional)", "", "date")}
              {field("maturity", "Maturity date (optional)", "", "date")}
            </div>
            <label className="nl-toggle-row">
              <Switch
                checked={draft.include}
                onCheckedChange={(v) => change("include", v)}
              />
              <span>
                Include this debt in net worth
                <small>This does not change available to save.</small>
              </span>
            </label>
            <label>
              Financed asset (optional)
              <NativeSelect
                value={draft.linkedAsset}
                onChange={(e) => change("linkedAsset", e.target.value)}
              >
                <option value="">No linked asset</option>
                {draft.linkedAsset &&
                  !assets.some((a) => String(a.id) === draft.linkedAsset) && (
                    <option value={draft.linkedAsset}>
                      Existing linked asset (not available in this view)
                    </option>
                  )}
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <p className="nl-muted">
              Links the debt to an asset for equity and existing retirement
              forecasts. It does not create an envelope.
            </p>
          </details>
        </>
      )}
      {!balanceOnly && !loan && (
        <details className="nl-editor-details">
          <summary>Retirement & forecast settings</summary>
          <p className="nl-muted">
            These settings support your existing retirement forecast. They do
            not change the value recorded above.
          </p>
          {field("returnRate", "Assumed annual change %", "0")}
          <label className="nl-toggle-row">
            <Switch
              checked={draft.rmd}
              onCheckedChange={(v) => change("rmd", v)}
            />
            <span>
              Subject to required minimum distributions
              <small>Keep the setting appropriate for this account.</small>
            </span>
          </label>
          <label className="nl-toggle-row">
            <Switch
              checked={draft.liquid}
              onCheckedChange={(v) => change("liquid", v)}
            />
            <span>
              Can be converted to cash
              <small>Still excluded from your spendable budget.</small>
            </span>
          </label>
        </details>
      )}
    </SetupDialog>
  );
}
