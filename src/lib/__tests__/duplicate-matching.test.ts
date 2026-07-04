import { describe, expect, it } from 'vitest';
import { descriptionsMatchForDuplicate } from '../duplicate-matching';

describe('descriptionsMatchForDuplicate', () => {
  it('matches short import merchant names against full bank descriptions', () => {
    expect(
      descriptionsMatchForDuplicate(
        { description: 'ZAXBYS 1050 GREENVILLE SC' },
        { description: "Zaxby's", merchant: "Zaxby's" }
      )
    ).toBe(true);
  });

  it('matches when import description is a prefix of existing description', () => {
    expect(
      descriptionsMatchForDuplicate(
        { description: "ZAXBY'S #42901 GREER SC" },
        { description: "Zaxby's", merchant: "Zaxby's" }
      )
    ).toBe(true);
  });

  it('does not match different merchants with the same amount and date', () => {
    expect(
      descriptionsMatchForDuplicate(
        { description: 'WALMART SUPERCENTER' },
        { description: 'Target', merchant: 'Target' }
      )
    ).toBe(false);
  });

  it('uses stored merchant names when available', () => {
    expect(
      descriptionsMatchForDuplicate(
        {
          description: 'ZAXBYS 1050 GREENVILLE SC',
          merchantName: "Zaxby's",
        },
        { description: "Zaxby's", merchant: "Zaxby's" }
      )
    ).toBe(true);
  });
});
