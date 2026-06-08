import { addMonths, format, parseISO, subMonths } from 'date-fns';

const STORAGE_KEY_MONTH = 'dashboard-categories-spending-month';
const STORAGE_KEY_HEURISTIC = 'dashboard-categories-spending-heuristic-applied-for';

export function monthKeyFromDate(d: Date): string {
  return format(d, 'yyyy-MM');
}

export function previousMonthKey(ym: string): string {
  return format(subMonths(parseISO(`${ym}-01`), 1), 'yyyy-MM');
}

export function nextMonthKey(ym: string): string {
  return format(addMonths(parseISO(`${ym}-01`), 1), 'yyyy-MM');
}

export function formatBudgetMonthLabel(ym: string): string {
  return format(parseISO(`${ym}-01`), 'MMMM yyyy');
}

/** Days 1–5 of each month: default dashboard category spending to the previous month once per calendar month, unless the user already chose the current month. */
export function resolveBudgetViewMonthOnMount(): string {
  const now = new Date();
  const day = now.getDate();
  const currentKey = monthKeyFromDate(now);
  const stored = localStorage.getItem(STORAGE_KEY_MONTH);
  const heuristicFor = localStorage.getItem(STORAGE_KEY_HEURISTIC);

  const validStored = stored && /^\d{4}-\d{2}$/.test(stored) ? stored : null;

  if (validStored && validStored > currentKey) {
    localStorage.setItem(STORAGE_KEY_MONTH, currentKey);
    return currentKey;
  }

  if (day >= 1 && day <= 5 && heuristicFor !== currentKey) {
    if (validStored === currentKey) {
      localStorage.setItem(STORAGE_KEY_HEURISTIC, currentKey);
      return currentKey;
    }
    const target = previousMonthKey(currentKey);
    localStorage.setItem(STORAGE_KEY_MONTH, target);
    localStorage.setItem(STORAGE_KEY_HEURISTIC, currentKey);
    return target;
  }

  if (validStored) {
    return validStored;
  }

  return currentKey;
}

export function persistBudgetViewMonthChoice(month: string): void {
  localStorage.setItem(STORAGE_KEY_MONTH, month);
  localStorage.setItem(STORAGE_KEY_HEURISTIC, monthKeyFromDate(new Date()));
}
