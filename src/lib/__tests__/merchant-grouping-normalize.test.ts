import { describe, expect, it } from 'vitest';
import { extractDisplayName, normalizeMerchantName } from '../merchant-grouping';

describe('normalizeMerchantName / extractDisplayName', () => {
  it('collapses location and store-number variants to clean brands', () => {
    expect(normalizeMerchantName('ALDI INC BATAVIA IL')).toBe('ALDI');
    expect(normalizeMerchantName('TARGET T-1182')).toBe('TARGET');
    expect(normalizeMerchantName('BURGER KING #17020 Q07 TAYLORS SC')).toBe('BURGER KING');

    expect(extractDisplayName('ALDI INC BATAVIA IL')).toBe('Aldi');
    expect(extractDisplayName('Aldi Greenville Sc')).toBe('Aldi');
    expect(extractDisplayName('TARGET T-1182')).toBe('Target');
    expect(extractDisplayName('BURGER KING #17020 Q07 TAYLORS SC')).toBe('Burger King');
  });
});
