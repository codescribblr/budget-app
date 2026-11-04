/** Monetary preconditions compare displayed cents, not JavaScript arithmetic residue.
 * Only normalizes reviewed expectations; it never changes requested movements. */
export function normalizeMoneyExpectation(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error("Invalid reviewed balance. Refresh before saving.");
  const cents = Math.round(value * 100);
  if (!Number.isSafeInteger(cents))
    throw new Error("Invalid reviewed balance. Refresh before saving.");
  return cents / 100;
}
