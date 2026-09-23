/** Previous calendar day for an ISO date, without UTC timezone shifts. */
export function previousCalendarDay(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface CategorySplitAmount {
  category_id: number;
  amount: number;
}

function splitSignature(splits: CategorySplitAmount[]): string {
  const totals = new Map<number, number>();
  for (const split of splits) {
    const cents = Math.round(Number(split.amount) * 100);
    const safeCents = Number.isFinite(cents) ? cents : 0;
    totals.set(split.category_id, (totals.get(split.category_id) ?? 0) + safeCents);
  }

  return Array.from(totals.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([categoryId, cents]) => `${categoryId}:${cents}`)
    .join('|');
}

function splitRowSignature(splits: CategorySplitAmount[]): string {
  return splits
    .map((split) => {
      const cents = Math.round(Number(split.amount) * 100);
      return `${split.category_id}:${Number.isFinite(cents) ? cents : 0}`;
    })
    .sort()
    .join('|');
}

/** True when the stored split rows themselves changed, even if category totals did not. */
export function splitRowsDiffer(
  previous: CategorySplitAmount[],
  next: CategorySplitAmount[],
): boolean {
  return splitRowSignature(previous) !== splitRowSignature(next);
}

/**
 * True when an edit changes which envelopes a transaction affects.
 * Account, date, and description edits do not.
 */
export function splitsAffectEnvelopesDifferently(
  previous: CategorySplitAmount[],
  next: CategorySplitAmount[],
  previousType: 'income' | 'expense',
  nextType: 'income' | 'expense',
): boolean {
  if (previousType !== nextType) return true;
  return splitSignature(previous) !== splitSignature(next);
}

function toMoney(value: number): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

/**
 * Splits to send when a category-page inline edit moves this category's portion
 * of a transaction somewhere else.
 *
 * A transaction that only belongs to the current category is replaced with one
 * split for the full amount, matching the transactions page. A transaction split
 * across categories keeps the other portions and moves only this category's amount.
 *
 * Returns null when the selection does not change the splits.
 * The transactions API reverses the old splits and applies these new ones, which
 * moves the envelope balance off the old category and onto the new one.
 */
export function splitsAfterCategoryMove(input: {
  splits: CategorySplitAmount[];
  totalAmount: number;
  fromCategoryId: number;
  toCategoryId: number;
}): CategorySplitAmount[] | null {
  const { splits, totalAmount, fromCategoryId, toCategoryId } = input;

  if (!Number.isFinite(fromCategoryId) || !Number.isFinite(toCategoryId)) return null;
  if (fromCategoryId === toCategoryId) return null;

  const moving = splits.filter((split) => split.category_id === fromCategoryId);
  if (moving.length === 0) return null;

  const staying = splits.filter((split) => split.category_id !== fromCategoryId);
  if (staying.length === 0) {
    const splitTotal = toMoney(splits.reduce((sum, split) => sum + Number(split.amount), 0));
    const wholeAmount = toMoney(totalAmount) > 0 ? toMoney(totalAmount) : splitTotal;
    return [{ category_id: toCategoryId, amount: wholeAmount }];
  }

  const combined = new Map<number, number>();
  for (const split of staying) {
    const amount = toMoney(split.amount);
    combined.set(split.category_id, toMoney((combined.get(split.category_id) ?? 0) + amount));
  }

  const movingAmount = toMoney(moving.reduce((sum, split) => sum + Number(split.amount), 0));
  combined.set(toCategoryId, toMoney((combined.get(toCategoryId) ?? 0) + movingAmount));

  return Array.from(combined.entries()).map(([category_id, amount]) => ({
    category_id,
    amount,
  }));
}
