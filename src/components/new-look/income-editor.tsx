"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  CreateIncomeStreamRequest,
  IncomeStream,
  NonCashAsset,
  PayFrequency,
} from "@/lib/types";
import { calculateStreamMonthlyNet } from "@/lib/income-calculations";
import {
  incomeMultiplier,
  payFrequencies,
  validateIncomeSource,
  type IncomeBasis,
} from "@/lib/income-planning";
import { money, parseMoney } from "@/lib/new-look";
import { useUnsavedChanges } from "./budget-context";

export function IncomeEditor({
  stream,
  assets,
  assetsError,
  canEdit,
  onSave,
  onClose,
}: {
  stream: IncomeStream | null;
  assets: NonCashAsset[];
  assetsError: string | null;
  canEdit: boolean;
  onSave: (source: CreateIncomeStreamRequest) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(stream?.name || "");
  const [basis, setBasis] = useState<IncomeBasis>(stream ? "year" : "paycheck");
  const [amount, setAmount] = useState(
    stream ? String(stream.annual_income) : "",
  );
  // Keep the annual value when changing display units, avoiding rounding drift.
  const [annual, setAnnual] = useState<number | null>(
    stream?.annual_income ?? null,
  );
  const [frequency, setFrequency] = useState<PayFrequency>(
    stream?.pay_frequency || "monthly",
  );
  const [tax, setTax] = useState(
    String(Number(((stream?.tax_rate || 0) * 100).toPrecision(12))),
  );
  const [extra, setExtra] = useState(stream?.include_extra_paychecks ?? true);
  const [included, setIncluded] = useState(stream?.include_in_budget ?? true);
  const [linkedAsset, setLinkedAsset] = useState(
    stream?.linked_non_cash_asset_id ?? null,
  );
  const [deductions, setDeductions] = useState(
    (stream?.pre_tax_deduction_items || []).map((d) => ({
      ...d,
      value: String(d.value),
    })),
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useUnsavedChanges(dirty);
  const source: CreateIncomeStreamRequest = {
    name: name.trim(),
    annual_income: annual ?? NaN,
    tax_rate: /^\d+(?:\.\d{0,6})?$/.test(tax.trim()) ? Number(tax) / 100 : NaN,
    pay_frequency: frequency,
    include_extra_paychecks: extra,
    include_in_budget: included,
    linked_non_cash_asset_id: linkedAsset,
    pre_tax_deduction_items: deductions.map((d) => ({
      ...d,
      name: d.name.trim(),
      value: parseMoney(d.value) ?? NaN,
    })),
  };
  const validation = validateIncomeSource(source);
  const preview = validation
    ? null
    : calculateStreamMonthlyNet(source as IncomeStream);
  function close() {
    if (saving) return;
    if (dirty) setConfirmDiscard(true);
    else onClose();
  }
  async function save() {
    if (saving || !canEdit) return;
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(source);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save income. Your edits are still here.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="new-look nl-income-dialog sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {stream ? "Edit income source" : "Add income source"}
          </DialogTitle>
          <DialogDescription>
            Use expected gross pay to estimate what this source contributes to
            your monthly plan.
          </DialogDescription>
        </DialogHeader>
        <form
          className="nl-income-editor"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          onChange={() => {
            setDirty(true);
            setError(null);
            setConfirmDiscard(false);
          }}
        >
          <fieldset
            disabled={saving || !canEdit}
            className="nl-form nl-income-fields"
          >
            <label>
              Source name
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Main job, freelance work, rental"
                maxLength={200}
              />
            </label>
            <div className="nl-income-field-grid">
              <label>
                Gross pay
                <input
                  inputMode="decimal"
                  value={amount}
                  placeholder="0.00"
                  onChange={(e) => {
                    setAmount(e.target.value);
                    const value = parseMoney(e.target.value);
                    setAnnual(
                      value === null
                        ? null
                        : Math.round(
                            value * incomeMultiplier(basis, frequency) * 100,
                          ) / 100,
                    );
                  }}
                />
                <small>Before taxes and deductions.</small>
              </label>
              <label>
                Amount is
                <select
                  value={basis}
                  onChange={(e) => {
                    const next = e.target.value as IncomeBasis;
                    setBasis(next);
                    if (annual !== null)
                      setAmount(
                        (annual / incomeMultiplier(next, frequency)).toFixed(2),
                      );
                  }}
                >
                  <option value="paycheck">Per paycheck</option>
                  <option value="month">Per month</option>
                  <option value="year">Per year</option>
                </select>
              </label>
              <label>
                Pay schedule
                <select
                  value={frequency}
                  onChange={(e) => {
                    const next = e.target.value as PayFrequency;
                    setFrequency(next);
                    if (basis === "paycheck") {
                      const value = parseMoney(amount);
                      setAnnual(
                        value === null
                          ? null
                          : Math.round(
                              value * incomeMultiplier(basis, next) * 100,
                            ) / 100,
                      );
                    }
                  }}
                >
                  {payFrequencies.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Estimated tax rate (%)
                <input
                  inputMode="decimal"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                />
                <small>Enter 20 for 20%. Use your combined estimate.</small>
              </label>
            </div>
            {frequency === "bi-weekly" && (
              <label>
                Monthly planning basis
                <select
                  value={extra ? "all" : "two"}
                  onChange={(e) => setExtra(e.target.value === "all")}
                >
                  <option value="all">
                    Average all 26 paychecks over the year
                  </option>
                  <option value="two">Use 2 paychecks per month</option>
                </select>
                <small>
                  The two-paycheck option keeps the extra paychecks out of
                  regular monthly funding.
                </small>
              </label>
            )}
            <details
              className="nl-income-details"
              open={deductions.length ? true : undefined}
            >
              <summary>
                Pre-tax deductions{" "}
                <span>
                  {deductions.length ? `(${deductions.length})` : "· Optional"}
                </span>
              </summary>
              <p>
                Use amounts per paycheck, or a percentage of gross pay. These
                are deducted before estimating taxes.
              </p>
              {deductions.map((d, i) => (
                <div className="nl-deduction-row" key={d.id}>
                  <label>
                    Name
                    <input
                      aria-label={`Deduction ${i + 1} name`}
                      placeholder="e.g., 401(k)"
                      value={d.name}
                      onChange={(e) =>
                        setDeductions((ds) =>
                          ds.map((item) =>
                            item.id === d.id
                              ? { ...item, name: e.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Basis
                    <select
                      aria-label={`Deduction ${i + 1} basis`}
                      value={d.type}
                      onChange={(e) =>
                        setDeductions((ds) =>
                          ds.map((item) =>
                            item.id === d.id
                              ? {
                                  ...item,
                                  type: e.target.value as
                                    "fixed" | "percentage",
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="fixed">$ per paycheck</option>
                      <option value="percentage">% of gross pay</option>
                    </select>
                  </label>
                  <label>
                    {d.type === "fixed" ? "Amount ($)" : "Percent (%)"}
                    <input
                      aria-label={`Deduction ${i + 1} value`}
                      inputMode="decimal"
                      value={d.value}
                      onChange={(e) =>
                        setDeductions((ds) =>
                          ds.map((item) =>
                            item.id === d.id
                              ? { ...item, value: e.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="nl-secondary"
                    aria-label={`Remove deduction ${i + 1}`}
                    onClick={() => {
                      setDeductions((ds) =>
                        ds.filter((item) => item.id !== d.id),
                      );
                      setDirty(true);
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="nl-secondary"
                onClick={() => {
                  setDeductions((ds) => [
                    ...ds,
                    {
                      id: crypto.randomUUID(),
                      name: "",
                      type: "fixed",
                      value: "",
                    },
                  ]);
                  setDirty(true);
                }}
              >
                <Plus size={16} /> Add deduction
              </button>
            </details>
            <details className="nl-income-details">
              <summary>
                Retirement forecast link <span>· Optional</span>
              </summary>
              <p>
                If this income comes from an asset, linking it tells the
                retirement forecast to stop this income when the asset is
                liquidated.
              </p>
              {assetsError && (
                <p role="status">
                  Asset choices could not load. The existing link will be kept.
                </p>
              )}
              <label>
                Linked asset
                <select
                  value={linkedAsset ?? "none"}
                  disabled={!!assetsError}
                  onChange={(e) =>
                    setLinkedAsset(
                      e.target.value === "none" ? null : Number(e.target.value),
                    )
                  }
                >
                  <option value="none">No linked asset</option>
                  {linkedAsset !== null &&
                    !assets.some((a) => a.id === linkedAsset) && (
                      <option value={linkedAsset}>Existing linked asset</option>
                    )}
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            </details>
            <label className="nl-switch-label">
              <Switch
                className="nl-switch"
                aria-label="Include in my monthly plan"
                aria-describedby="income-inclusion-help"
                checked={included}
                disabled={saving || !canEdit}
                onCheckedChange={(checked) => {
                  setIncluded(checked);
                  setDirty(true);
                  setError(null);
                  setConfirmDiscard(false);
                }}
              />
              <span>
                Include in my monthly plan
                <small
                  className="nl-income-check-help"
                  id="income-inclusion-help"
                >
                  Turn off for income you don’t want to rely on for regular
                  funding.
                </small>
              </span>
            </label>
          </fieldset>
          <div className="nl-income-editor-footer">
            <div className="nl-income-preview" aria-live="polite">
              <div>
                <span>
                  {included
                    ? "Monthly planning estimate"
                    : "Excluded from monthly total"}
                </span>
                <strong>
                  {preview === null ? "—" : money(included ? preview : 0)}
                </strong>
              </div>
              <small>
                {annual !== null && annual >= 0
                  ? `Based on ${money(annual)} gross per year. `
                  : ""}
                Saving updates planning only; it does not add money to accounts
                or envelopes.
              </small>
            </div>
            {error && (
              <p className="nl-error" role="alert">
                {error}
              </p>
            )}
            {preview !== null && preview < 0 && (
              <p className="nl-notice">
                This estimate is negative. Review gross pay, deductions, tax
                rate, and the monthly planning basis.
              </p>
            )}
            {confirmDiscard && (
              <p role="alert" className="nl-notice">
                Discard your unsaved income edits?
              </p>
            )}
            <div className="nl-form-actions">
              <button
                type="button"
                className="nl-secondary"
                onClick={
                  confirmDiscard ? () => setConfirmDiscard(false) : close
                }
                disabled={saving}
              >
                {confirmDiscard ? "Keep editing" : "Cancel"}
              </button>
              <button
                className="nl-primary"
                type={confirmDiscard ? "button" : "submit"}
                onClick={confirmDiscard ? onClose : undefined}
                disabled={saving || (!confirmDiscard && !canEdit)}
              >
                {saving
                  ? "Saving…"
                  : confirmDiscard
                    ? "Discard edits"
                    : "Save income"}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
