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

/**
 * Format currency with abbreviations (K, M, B) for chart axes
 * Examples: $1.25K, $2.50M, $1.00B
 */
export function formatCurrencyAbbreviated(amount: number): string {
  const absAmount = Math.abs(amount);
  
  if (absAmount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  } else if (absAmount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  } else if (absAmount >= 1_000) {
    return `$${(amount / 1_000).toFixed(2)}K`;
  } else {
    return `$${amount.toFixed(2)}`;
  }
}

