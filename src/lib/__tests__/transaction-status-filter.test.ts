import { describe, expect, it } from 'vitest';
import {
  detectStatusColumnIndex,
  shouldExcludeTransactionByStatus,
  parseCSVWithMapping,
} from '../csv-parser-helpers';
import type { ColumnMapping } from '../mapping-templates';

const ROBINHOOD_HEADERS = [
  'Date',
  'Time',
  'Cardholder',
  'Amount',
  'Points',
  'Balance',
  'Status',
  'Type',
  'Merchant',
  'Description',
];

describe('shouldExcludeTransactionByStatus', () => {
  it('excludes declined transactions from dedicated status column values', () => {
    expect(shouldExcludeTransactionByStatus('Declined')).toBe(true);
    expect(shouldExcludeTransactionByStatus('declined')).toBe(true);
  });

  it('excludes pending transactions', () => {
    expect(shouldExcludeTransactionByStatus('Pending')).toBe(true);
  });

  it('includes posted transactions', () => {
    expect(shouldExcludeTransactionByStatus('Posted')).toBe(false);
    expect(shouldExcludeTransactionByStatus('Cleared')).toBe(false);
  });

  it('does not treat merchant/description text as status', () => {
    expect(shouldExcludeTransactionByStatus('Transact')).toBe(null);
    expect(shouldExcludeTransactionByStatus('Declined Payment Services LLC')).toBe(null);
  });
});

describe('detectStatusColumnIndex', () => {
  it('detects the Status column in Robinhood-style CSV exports', () => {
    const data = [
      ROBINHOOD_HEADERS,
      ['2026-06-22', '11:49 AM', 'Jonathan Wadsworth', '336.34', '0', '', 'Declined', 'Cash Advance', 'Transact', ''],
      ['2026-06-23', '9:00 AM', 'Jonathan Wadsworth', '12.00', '36', '', 'Posted', 'Purchase', 'Taco Bell', ''],
      ['2026-06-24', '1:00 PM', 'Jonathan Wadsworth', '5.00', '15', '', 'Pending', 'Purchase', 'Coffee Shop', ''],
    ];

    expect(detectStatusColumnIndex(data, true)).toBe(6);
  });

  it('returns null when no dedicated status column exists', () => {
    const data = [
      ['Date', 'Description', 'Amount'],
      ['2026-06-22', 'Declined Payment Co', '10.00'],
      ['2026-06-23', 'Grocery Store', '20.00'],
    ];

    expect(detectStatusColumnIndex(data, true)).toBe(null);
  });
});

describe('parseCSVWithMapping upload path', () => {
  const ROBINHOOD_TEMPLATE_MAPPING: ColumnMapping = {
    dateColumn: 0,
    amountColumn: 3,
    descriptionColumn: 8,
    debitColumn: null,
    creditColumn: null,
    transactionTypeColumn: null,
    statusColumn: null,
    amountSignConvention: 'positive_is_expense',
    dateFormat: 'yyyy-MM-dd',
    hasHeaders: true,
  };

  it('excludes declined rows when using saved template mapping without status column', async () => {
    const data = [
      ROBINHOOD_HEADERS,
      ['2026-06-22', '11:49 AM', 'Jonathan Wadsworth', '336.34', '0', '', 'Declined', 'Cash Advance', 'Transact', ''],
      ['2026-06-23', '9:00 AM', 'Jonathan Wadsworth', '12.00', '36', '', 'Posted', 'Purchase', 'Taco Bell', ''],
    ];

    const transactions = await parseCSVWithMapping(data, ROBINHOOD_TEMPLATE_MAPPING, 'card.csv');

    expect(transactions).toHaveLength(1);
    expect(transactions[0].description).toBe('Taco Bell');
  });
});
