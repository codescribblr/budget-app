import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tryParseCSVWithTemplate } from '../csv-template-parser';
import type { CSVImportTemplate } from '../../mapping-templates';

const data = [
  ['DATE', 'DESCRIPTION', 'AMOUNT', 'CHECK #', 'STATUS'],
  ['11/03/2026', 'Grocery store', '-50.00', '', 'Posted'],
  ['11/02/2026', 'Payroll', '200.00', '', 'Posted'],
];

const template: CSVImportTemplate = {
  id: 20,
  userId: 'test-user',
  fingerprint: '5-648d3d59',
  columnCount: 5,
  mapping: {
    dateColumn: 0,
    amountColumn: 2,
    descriptionColumn: 1,
    debitColumn: null,
    creditColumn: null,
    transactionTypeColumn: null,
    statusColumn: null,
    amountSignConvention: 'positive_is_income',
    dateFormat: 'MM/dd/yyyy',
    hasHeaders: true,
  },
};

describe('saved CSV template upload recovery', () => {
  it('requests manual mapping when the saved amount column is outside the file', async () => {
    // Regression: a five-column checking export was saved with a six-column mapping.
    const staleTemplate = {
      ...template,
      mapping: { ...template.mapping, amountColumn: 5, descriptionColumn: 2 },
    };

    assert.equal(await tryParseCSVWithTemplate(data, staleTemplate, 'checking.csv'), null);
  });

  it('requests manual mapping when a present column cannot supply amounts', async () => {
    const staleTemplate = {
      ...template,
      mapping: { ...template.mapping, amountColumn: 3 },
    };

    assert.equal(await tryParseCSVWithTemplate(data, staleTemplate, 'checking.csv'), null);
  });

  it('keeps successful template parsing and status filtering', async () => {
    const transactions = await tryParseCSVWithTemplate([
      ...data,
      ['11/04/2026', 'Unsettled purchase', '-10.00', '', 'Pending'],
    ], template, 'checking.csv');

    assert.deepEqual(
      transactions?.map(({ date, description, amount, transaction_type }) => ({
        date, description, amount, transaction_type,
      })),
      [
        { date: '2026-11-03', description: 'Grocery store', amount: 50, transaction_type: 'expense' },
        { date: '2026-11-02', description: 'Payroll', amount: 200, transaction_type: 'income' },
      ]
    );
  });

  it('requests manual mapping if parsing the template throws', async (t) => {
    t.mock.method(console, 'warn', () => {});
    const malformedTemplate = { ...template, mapping: null } as unknown as CSVImportTemplate;

    assert.equal(await tryParseCSVWithTemplate(data, malformedTemplate, 'checking.csv'), null);
  });
});
