import { describe, expect, it } from 'vitest';
import { normalizeGlobalMerchantPattern } from '@/lib/merchant-pattern-normalize';

/**
 * Pure checks that document what the batched recompute endpoint expects
 * after migration 127 (function-only) lands without the old set-based DML.
 */
describe('recompute-normalized-patterns helpers', () => {
  it('normalizes brand TLDs and apostrophes the same way the SQL twin should', () => {
    expect(normalizeGlobalMerchantPattern("WALMART.COM")).toBe('walmart');
    expect(normalizeGlobalMerchantPattern("PAPA JOHN'S")).toBe('papa johns');
    expect(normalizeGlobalMerchantPattern('TARGET.NET PURCHASE')).toBe('target');
  });

  it('uppercases the global normalizer for merchant_mappings parity with SQL', () => {
    const next = normalizeGlobalMerchantPattern("WALMART.COM").toUpperCase();
    expect(next).toBe('WALMART');
  });
});
