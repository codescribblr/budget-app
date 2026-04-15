import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/** Drop a trailing `.00` from a fixed-2-decimal string (e.g. chart axes). */
function abbrevNumberPart(scaled: number): string {
  const s = scaled.toFixed(2);
  return s.endsWith('.00') ? s.slice(0, -3) : s;
}

/**
 * Format currency with abbreviations (K, M, B) for chart axes
 * Examples: $1.25K, $2.5M, $2M (whole millions omit `.00`)
 */
export function formatCurrencyAbbreviated(amount: number): string {
  const absAmount = Math.abs(amount);

  if (absAmount >= 1_000_000_000) {
    return `$${abbrevNumberPart(amount / 1_000_000_000)}B`;
  }
  if (absAmount >= 1_000_000) {
    return `$${abbrevNumberPart(amount / 1_000_000)}M`;
  }
  if (absAmount >= 1_000) {
    return `$${abbrevNumberPart(amount / 1_000)}K`;
  }
  return `$${abbrevNumberPart(amount)}`;
}
