import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  descriptionsMatchForDuplicate,
  extractComparableTextsFromOriginalData,
} from '../duplicate-matching';

describe('descriptionsMatchForDuplicate', () => {
  it('matches short import merchant names against full bank descriptions', () => {
    assert.equal(
      descriptionsMatchForDuplicate(
        { description: 'ZAXBYS 1050 GREENVILLE SC' },
        { description: "Zaxby's", merchant: "Zaxby's" }
      ),
      true
    );
  });

  it('matches when import description is a prefix of existing description', () => {
    assert.equal(
      descriptionsMatchForDuplicate(
        { description: "ZAXBY'S #42901 GREER SC" },
        { description: "Zaxby's", merchant: "Zaxby's" }
      ),
      true
    );
  });

  it('does not match different merchants with the same amount and date', () => {
    assert.equal(
      descriptionsMatchForDuplicate(
        { description: 'WALMART SUPERCENTER' },
        { description: 'Target', merchant: 'Target' }
      ),
      false
    );
  });

  it('uses stored merchant names when available', () => {
    assert.equal(
      descriptionsMatchForDuplicate(
        {
          description: 'ZAXBYS 1050 GREENVILLE SC',
          merchantName: "Zaxby's",
        },
        { description: "Zaxby's", merchant: "Zaxby's" }
      ),
      true
    );
  });

  it('matches short import labels using raw CSV original data', () => {
    const originalData = {
      0: '04/27/2026',
      1: 'SCGOV866-340-7105DMV0049 GREER SC',
      2: '26.43',
      3: 'scdmv',
      _uploadFileName: 'card-export.csv',
    };

    assert.equal(
      descriptionsMatchForDuplicate(
        { description: 'SCGOV866-340-7105DMV0049 GREER SC' },
        { description: 'scdmv', merchant: 'scdmv', originalData }
      ),
      true
    );
  });

  it('matches when existing transaction has stored original import row text', () => {
    assert.equal(
      descriptionsMatchForDuplicate(
        {
          description: 'scdmv',
          originalImportTexts: ['SCGOV866-340-7105DMV0049 GREER SC', '26.43'],
        },
        {
          description: 'scdmv',
          merchant: 'scdmv',
          originalData: {
            0: '04/27/2026',
            1: 'SCGOV866-340-7105DMV0049 GREER SC',
            2: '26.43',
          },
        }
      ),
      true
    );
  });
});

describe('extractComparableTextsFromOriginalData', () => {
  it('extracts CSV row values and skips metadata keys', () => {
    assert.deepEqual(
      extractComparableTextsFromOriginalData({
        0: '04/27/2026',
        1: 'SCGOV866-340-7105DMV0049 GREER SC',
        isDuplicate: true,
        _uploadFileName: 'card-export.csv',
      }),
      ['04/27/2026', 'SCGOV866-340-7105DMV0049 GREER SC']
    );
  });
});
