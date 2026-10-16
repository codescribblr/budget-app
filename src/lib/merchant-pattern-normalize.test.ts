import { describe, expect, it } from 'vitest';
import { normalizeGlobalMerchantPattern } from './merchant-pattern-normalize';

describe('normalizeGlobalMerchantPattern', () => {
  it("collapses dated Bridge City Coffee Square/SP strings", () => {
    expect(
      normalizeGlobalMerchantPattern('SP BRIDGE CITY CO 01/14 PURCHASE GREENVILLE SC')
    ).toBe('bridge city co');

    expect(
      normalizeGlobalMerchantPattern('SP BRIDGE CITY CO 02/03 PURCHASE GREENVILLE SC')
    ).toBe('bridge city co');
  });

  it('strips Square / TST / PayPal processor prefixes', () => {
    expect(normalizeGlobalMerchantPattern('SQ *BRIDGE CITY COFFEE')).toBe('bridge city coffee');
    expect(normalizeGlobalMerchantPattern('TST* STARBUCKS STORE')).toBe('starbucks store');
    expect(normalizeGlobalMerchantPattern('PAYPAL *WALMART')).toBe('walmart');
  });

  it('strips store/terminal numbers, city/state, and INC', () => {
    expect(normalizeGlobalMerchantPattern('ALDI INC BATAVIA IL')).toBe('aldi');
    expect(normalizeGlobalMerchantPattern('TARGET T-1182')).toBe('target');
    expect(normalizeGlobalMerchantPattern('BURGER KING #17020 Q07 TAYLORS SC')).toBe(
      'burger king'
    );
    expect(normalizeGlobalMerchantPattern('WALMART #12345 2024-01-15')).toBe('walmart');
    expect(normalizeGlobalMerchantPattern('TARGET T-98765 PURCHASE AUSTIN TX')).toBe('target');
    expect(normalizeGlobalMerchantPattern('Aldi Greenville Sc')).toBe('aldi');
  });

  it('keeps ambiguous brand fragments like BRIDGE CITY CO without purchase cues', () => {
    expect(normalizeGlobalMerchantPattern('BRIDGE CITY CO')).toBe('bridge city co');
  });

  it('returns empty for blank input', () => {
    expect(normalizeGlobalMerchantPattern('')).toBe('');
    expect(normalizeGlobalMerchantPattern('   ')).toBe('');
  });

  it('is stable across casing and extra whitespace', () => {
    expect(normalizeGlobalMerchantPattern('  amazon   mktp  ')).toBe('amazon mktp');
    expect(normalizeGlobalMerchantPattern('Amazon Mktp')).toBe('amazon mktp');
  });
});
