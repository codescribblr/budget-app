import { formatCurrencyAbbreviated, formatNumberAbbreviated } from '@/lib/utils';

/** Y-axis tick formatter for currency charts (e.g. $250K, $1.5M). */
export function formatChartCurrencyAxisTick(value: number): string {
  return formatCurrencyAbbreviated(Number(value));
}

/** Y-axis tick formatter for numeric (non-currency) charts. */
export function formatChartNumberAxisTick(value: number): string {
  return formatNumberAbbreviated(Number(value));
}

/** Default Recharts YAxis props for currency values — keeps abbreviated labels in view. */
export const chartCurrencyYAxisDefaults = {
  tickFormatter: formatChartCurrencyAxisTick,
  width: 56,
  tickMargin: 6,
} as const;

/** Default Recharts YAxis props for plain numeric values. */
export const chartNumberYAxisDefaults = {
  tickFormatter: formatChartNumberAxisTick,
  width: 48,
  tickMargin: 6,
} as const;
