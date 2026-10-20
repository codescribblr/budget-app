import type { Loan, NonCashAsset } from "./types";
import { cents, parseMoney } from "./new-look";

export type HoldingKind = "loans" | "investments";
export type Holding = Loan | NonCashAsset;
export const holdingEndpoint = (kind: HoldingKind) =>
  kind === "loans" ? "/api/loans" : "/api/non-cash-assets";
export const holdingValue = (item: Holding) =>
  Number("balance" in item ? item.balance : item.current_value);
export function loanReduction(loan: Loan) {
  const start = Number(loan.starting_balance);
  if (!Number.isFinite(start) || start <= 0) return null;
  const reduction = (cents(start) - cents(Number(loan.balance))) / 100;
  return { start, reduction, percent: (reduction / start) * 100 };
}
export const recordedDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
export function paymentDay(day: number | null) {
  if (!day) return "No due day saved";
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? "th"
      : { 1: "st", 2: "nd", 3: "rd" }[day % 10] || "th";
  return `${day}${suffix} of each month`;
}
export interface HoldingDraft {
  name: string;
  amount: string;
  institution: string;
  rate: string;
  payment: string;
  due: string;
  start: string;
  opened: string;
  maturity: string;
  include: boolean;
  linkedAsset: string;
  type: NonCashAsset["asset_type"];
  liquid: boolean;
  rmd: boolean;
  returnRate: string;
}
export function holdingDraft(item?: Holding): HoldingDraft {
  const loan = item && "balance" in item ? item : undefined;
  const asset = item && "current_value" in item ? item : undefined;
  return {
    name: item?.name || "",
    amount: item ? String(holdingValue(item)) : "",
    institution: loan?.institution || "",
    rate: loan?.interest_rate == null ? "" : String(loan.interest_rate),
    payment: loan?.minimum_payment == null ? "" : String(loan.minimum_payment),
    due: loan?.payment_due_date ? String(loan.payment_due_date) : "",
    start: loan?.starting_balance == null ? "" : String(loan.starting_balance),
    opened: loan?.open_date || "",
    maturity: loan?.maturity_date || "",
    include: loan?.include_in_net_worth ?? true,
    linkedAsset: loan?.linked_non_cash_asset_id
      ? String(loan.linked_non_cash_asset_id)
      : "",
    type: asset?.asset_type || "investment",
    liquid: asset?.is_liquid ?? false,
    rmd: asset?.is_rmd_qualified ?? false,
    returnRate: String(asset?.estimated_return_percentage ?? 0),
  };
}
function amount(value: string, label: string, optional = false) {
  if (!value.trim() && optional) return null;
  const parsed = parseMoney(value);
  if (parsed === null || parsed < 0)
    throw new Error(
      `Enter ${label} as zero or more, with up to two decimal places.`,
    );
  return parsed;
}
function date(value: string) {
  if (!value) return null;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new Error("Choose a valid calendar date.");
  return value;
}
/** Existing records send only changed fields, particularly balances and forecast metadata. */
export function prepareHolding(
  kind: HoldingKind,
  draft: HoldingDraft,
  original?: Holding,
  balanceOnly = false,
) {
  const current = amount(
    draft.amount,
    kind === "loans" ? "the amount owed" : "the current value",
  );
  const payload: Record<string, unknown> = {
    [kind === "loans" ? "balance" : "current_value"]: current,
  };
  if (!balanceOnly) {
    if (!draft.name.trim() || draft.name.trim().length > 255)
      throw new Error("Enter a name of 255 characters or fewer.");
    payload.name = draft.name.trim();
    if (kind === "loans") {
      const rate = amount(draft.rate, "the annual interest rate", true);
      if (rate !== null && rate > 100)
        throw new Error("Enter an annual interest rate between 0 and 100%.");
      if (
        draft.due &&
        (!/^\d+$/.test(draft.due) ||
          Number(draft.due) < 1 ||
          Number(draft.due) > 31)
      )
        throw new Error("Choose a payment day from 1 to 31.");
      if (
        draft.linkedAsset &&
        (!/^\d+$/.test(draft.linkedAsset) ||
          !Number.isSafeInteger(Number(draft.linkedAsset)) ||
          Number(draft.linkedAsset) <= 0)
      )
        throw new Error("Choose a valid asset.");
      Object.assign(payload, {
        institution: draft.institution.trim() || null,
        interest_rate: rate,
        minimum_payment: amount(draft.payment, "the monthly payment", true),
        payment_due_date: draft.due ? Number(draft.due) : null,
        starting_balance: amount(draft.start, "the starting debt", true),
        open_date: date(draft.opened),
        maturity_date: date(draft.maturity),
        include_in_net_worth: draft.include,
        linked_non_cash_asset_id: draft.linkedAsset
          ? Number(draft.linkedAsset)
          : null,
      });
    } else {
      if (
        ![
          "investment",
          "real_estate",
          "vehicle",
          "art",
          "insurance",
          "collectibles",
          "cryptocurrency",
          "other",
        ].includes(draft.type)
      )
        throw new Error("Choose an asset type.");
      if (
        original &&
        "rentcast_enabled" in original &&
        original.rentcast_enabled &&
        draft.type !== original.asset_type
      )
        throw new Error(
          "Turn off automatic property valuations in classic before changing this asset’s type.",
        );
      const rate = Number(draft.returnRate);
      if (
        !/^-?\d+(\.\d{0,2})?$/.test(draft.returnRate) ||
        rate < -100 ||
        rate > 100
      )
        throw new Error("Enter a forecast assumption between −100 and 100%.");
      Object.assign(payload, {
        asset_type: draft.type,
        is_liquid: draft.liquid,
        is_rmd_qualified: draft.rmd,
        estimated_return_percentage: rate,
      });
    }
  }
  if (original)
    for (const key of Object.keys(payload)) {
      if (
        payload[key] ===
          (original as unknown as Record<string, unknown>)[key] ||
        (typeof payload[key] === "number" &&
          payload[key] ===
            Number((original as unknown as Record<string, unknown>)[key]) &&
          (original as unknown as Record<string, unknown>)[key] != null)
      )
        delete payload[key];
    }
  return payload;
}
