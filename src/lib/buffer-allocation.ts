/** Epsilon for currency comparison — avoid false positives from floating-point rounding */
export const OVER_ALLOCATION_EPSILON = 0.01;

/** Shortfall when allocating more than available to save */
export function getAllocationOverage(availableToSave: number, totalAllocated: number): number {
  return Math.max(0, totalAllocated - availableToSave - OVER_ALLOCATION_EPSILON);
}

/** Default buffer withdrawal: cover overage, or drain buffer if insufficient */
export function getDefaultBufferWithdrawAmount(overage: number, bufferBalance: number): number {
  if (overage <= 0 || bufferBalance <= 0) return 0;
  return Math.min(overage, bufferBalance);
}

export function getProjectedAvailableToSave(
  availableToSave: number,
  totalAllocated: number,
  bufferWithdrawAmount: number
): number {
  return availableToSave + bufferWithdrawAmount - totalAllocated;
}

export function shouldOfferBufferWithdraw(
  incomeBufferEnabled: boolean,
  bufferBalance: number,
  availableToSave: number,
  totalAllocated: number
): boolean {
  if (!incomeBufferEnabled || bufferBalance <= OVER_ALLOCATION_EPSILON) {
    return false;
  }
  return getAllocationOverage(availableToSave, totalAllocated) > 0;
}
