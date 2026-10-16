import { describe, expect, it } from 'vitest';
import {
  extractDisplayName,
  normalizeMerchantName,
  resolveMerchantDisplayName,
} from '../merchant-grouping';

describe('normalizeMerchantName / extractDisplayName', () => {
  it('collapses location and store-number variants to clean brands', () => {
    expect(normalizeMerchantName('ALDI INC BATAVIA IL')).toBe('ALDI');
    expect(normalizeMerchantName('TARGET T-1182')).toBe('TARGET');
    expect(normalizeMerchantName('BURGER KING #17020 Q07 TAYLORS SC')).toBe('BURGER KING');

    expect(extractDisplayName('ALDI INC BATAVIA IL')).toBe('Aldi');
    expect(extractDisplayName('Aldi Greenville Sc')).toBe('Aldi');
    expect(extractDisplayName('TARGET T-1182')).toBe('Target');
    expect(extractDisplayName('BURGER KING #17020 Q07 TAYLORS SC')).toBe('Burger King');
    expect(extractDisplayName('SPILL THE BEANS R1 GREENVILLE SC')).toBe('Spill The Beans');
  });

  it('resolveMerchantDisplayName prefers candidates then cleaned fallback', () => {
    expect(resolveMerchantDisplayName('SPILL THE BEANS R1 GREENVILLE SC', 'Spill The Beans')).toBe(
      'Spill The Beans'
    );
    expect(resolveMerchantDisplayName('SPILL THE BEANS R1 GREENVILLE SC', null, '')).toBe(
      'Spill The Beans'
    );
    expect(resolveMerchantDisplayName('SPILL THE BEANS R1 GREENVILLE SC')).toBe('Spill The Beans');
    expect(resolveMerchantDisplayName('ONLINE TRANSFER TO JONATHAN WADSWORTH')).toBe(
      'Online Transfer'
    );
    expect(resolveMerchantDisplayName('SHELL OIL SIGONFILE')).toBe('Shell Oil');
  });
});
