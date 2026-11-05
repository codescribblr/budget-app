import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
    assert.equal(shouldExcludeTransactionByStatus('Declined'), true);
    assert.equal(shouldExcludeTransactionByStatus('declined'), true);
  });

  it('excludes pending transactions', () => {
    assert.equal(shouldExcludeTransactionByStatus('Pending'), true);
  });

  it('includes posted transactions', () => {
    assert.equal(shouldExcludeTransactionByStatus('Posted'), false);
    assert.equal(shouldExcludeTransactionByStatus('Cleared'), false);
  });

  it('does not treat merchant/description text as status', () => {
    assert.equal(shouldExcludeTransactionByStatus('Transact'), null);
    assert.equal(shouldExcludeTransactionByStatus('Declined Payment Services LLC'), null);
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

    assert.equal(detectStatusColumnIndex(data, true), 6);
  });

  it('returns null when no dedicated status column exists', () => {
    const data = [
      ['Date', 'Description', 'Amount'],
      ['2026-06-22', 'Declined Payment Co', '10.00'],
      ['2026-06-23', 'Grocery Store', '20.00'],
    ];

    assert.equal(detectStatusColumnIndex(data, true), null);
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

    assert.equal(transactions.length, 1);
    assert.equal(transactions[0].description, 'Taco Bell');
  });

  it('supports debit/credit fallback when amount column is not mapped', async () => {
    const data = [
      ['Date', 'Debit', 'Credit', 'Description', 'Status'],
      ['2026-06-23', '12.00', '', 'Grocery Store', 'Posted'],
      ['2026-06-24', '', '50.00', 'Paycheck', 'Posted'],
    ];

    const mapping: ColumnMapping = {
      dateColumn: 0,
      amountColumn: null,
      descriptionColumn: 3,
      debitColumn: 1,
      creditColumn: 2,
      transactionTypeColumn: null,
      statusColumn: 4,
      amountSignConvention: 'positive_is_expense',
      dateFormat: 'yyyy-MM-dd',
      hasHeaders: true,
    };

    const transactions = await parseCSVWithMapping(data, mapping, 'bank.csv');

    assert.deepEqual(
      transactions.map(({ description, amount, transaction_type }) => ({ description, amount, transaction_type })),
      [
        { description: 'Grocery Store', amount: 12, transaction_type: 'expense' },
        { description: 'Paycheck', amount: 50, transaction_type: 'income' },
      ]
    );
  });
});
