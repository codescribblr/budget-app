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

/** Compact numeric part for chart axis labels (drops unnecessary decimals). */
function abbrevNumberPart(scaled: number): string {
  return scaled
    .toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
    .replace(/\.00$/, '');
}

/**
 * Format a plain number with K/M/B suffixes for chart axes (non-currency).
 */
export function formatNumberAbbreviated(value: number): string {
  const sign = value < 0 ? '-' : '';
  const absValue = Math.abs(value);

  if (absValue >= 1_000_000_000) {
    return `${sign}${abbrevNumberPart(absValue / 1_000_000_000)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}${abbrevNumberPart(absValue / 1_000_000)}M`;
  }
  if (absValue >= 1_000) {
    return `${sign}${abbrevNumberPart(absValue / 1_000)}K`;
  }
  return `${sign}${abbrevNumberPart(absValue)}`;
}

/**
 * Format currency with abbreviations (K, M, B) for chart axes.
 * Examples: $250K, $1.5M, $2M
 */
export function formatCurrencyAbbreviated(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const absAmount = Math.abs(amount);

  if (absAmount >= 1_000_000_000) {
    return `${sign}$${abbrevNumberPart(absAmount / 1_000_000_000)}B`;
  }
  if (absAmount >= 1_000_000) {
    return `${sign}$${abbrevNumberPart(absAmount / 1_000_000)}M`;
  }
  if (absAmount >= 1_000) {
    return `${sign}$${abbrevNumberPart(absAmount / 1_000)}K`;
  }
  return `${sign}$${abbrevNumberPart(absAmount)}`;
}
