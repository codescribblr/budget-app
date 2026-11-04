import {
  cents,
  parseMoney,
  ordinaryEnvelopes,
  remainingFunding,
  suggestAllocation,
  type Funding,
} from "./new-look";
import type { Category } from "./types";

export function suggestedBufferContribution(
  needed: number,
  available: number,
  bufferBalance: number,
) {
  return (
    Math.min(
      Math.max(0, cents(bufferBalance)),
      Math.max(0, cents(needed) - cents(available)),
    ) / 100
  );
}

/** Sum each envelope's own remaining target; excess funding in one never hides another's shortfall. */
export function monthlyFundingSuggestion(
  categories: Category[],
  funding: Funding[],
  available: number,
  bufferBalance: number,
  usePriority = true,
) {
  const needed = ordinaryEnvelopes(categories).map((category) =>
    remainingFunding(
      category,
      funding.find((row) => row.categoryId === category.id)?.fundedAmount ?? 0,
    ),
  );
  const remaining =
    needed.reduce((sum, amount) => sum + cents(amount), 0) / 100;
  const buffer =
    remaining > 0
      ? suggestedBufferContribution(remaining, available, bufferBalance)
      : 0;
  const amount =
    Math.min(cents(remaining), Math.max(0, cents(available) + cents(buffer))) /
    100;
  return {
    remaining,
    envelopeCount: needed.filter((amount) => amount > 0).length,
    buffer,
    amount,
    shortfall: (cents(remaining) - cents(amount)) / 100,
    canFundAll:
      available >= 0 && remaining > 0 && cents(amount) === cents(remaining),
    allocations: suggestAllocation(
      categories,
      funding,
      amount,
      usePriority,
      true,
    ),
  };
}

/** Buffer money stays reserved until the allocation and withdrawal commit together. */
export function paydayFunding({
  available,
  bufferBalance,
  bufferEnabled,
  useBuffer,
  bufferText,
  total,
}: {
  available: number;
  bufferBalance: number;
  bufferEnabled: boolean;
  useBuffer: boolean;
  bufferText: string;
  total: number;
}) {
  const parsed = useBuffer ? parseMoney(bufferText) : 0;
  const withdrawal = parsed !== null && parsed > 0 ? parsed : 0;
  let error = "";
  if (useBuffer) {
    if (!bufferEnabled)
      error =
        "Buffer money is unavailable. Turn it off to continue with Available to save.";
    else if (available < 0)
      error =
        "Cover the shortfall in Available to save before funding envelopes.";
    else if (parsed === null || parsed <= 0)
      error =
        "Enter a buffer amount greater than zero, with up to two decimals.";
    else if (cents(parsed) > cents(bufferBalance))
      error = "This is more than your buffer holds.";
    else if (total > 0 && cents(parsed) > cents(total))
      error =
        "The buffer contribution is more than you’re putting into envelopes. Reduce it or fund more envelopes.";
  }
  const usableWithdrawal =
    bufferEnabled && available >= 0 && cents(withdrawal) <= cents(bufferBalance)
      ? withdrawal
      : 0;
  const capacity =
    Math.max(0, cents(available) + cents(usableWithdrawal)) / 100;
  return {
    withdrawal,
    capacity,
    availableAfter: (cents(available) + cents(withdrawal) - cents(total)) / 100,
    bufferAfter: (cents(bufferBalance) - cents(withdrawal)) / 100,
    fromAvailable: (cents(total) - cents(withdrawal)) / 100,
    error,
    canFund:
      !error &&
      total > 0 &&
      cents(withdrawal) <= cents(total) &&
      cents(total) <= cents(capacity),
  };
}
