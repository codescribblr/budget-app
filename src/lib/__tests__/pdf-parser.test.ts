import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { parsePDFFile, parseTransactionsFromText } from '../pdf-parser';

const rows = (text: string) => parseTransactionsFromText(text, 'synthetic.pdf').map(({ date, description, amount, transaction_type }) => ({ date, description, amount, transaction_type }));

describe('PDF statement sign conventions', () => {
  it('keeps signed bank withdrawals and deposits correct despite the shared card-style heading', () => {
    const result = rows(`Checking account statement
Date          Description                     Amount
11/01/2024    TEST GROCER                     -12.34
11/03/2024    TEST BOOKSTORE                  -$8.90
11/05/2024    TEST PAYROLL                    +250.00
11/07/2024    TEST CAFE                       ($4.56)`);
    expect(result).toEqual([
      { date: '2024-11-01', description: 'TEST GROCER', amount: 12.34, transaction_type: 'expense' },
      { date: '2024-11-03', description: 'TEST BOOKSTORE', amount: 8.9, transaction_type: 'expense' },
      { date: '2024-11-05', description: 'TEST PAYROLL', amount: 250, transaction_type: 'income' },
      { date: '2024-11-07', description: 'TEST CAFE', amount: 4.56, transaction_type: 'expense' },
    ]);
  });

  it('keeps separate debit and credit columns intact', () => {
    expect(rows(`Savings account
Date          Description          Debit          Credit
11/01/2024    TEST GROCER          12.34          0.00
11/02/2024    TEST PAYROLL          0.00          250.00`).map(r => [r.amount, r.transaction_type])).toEqual([[12.34, 'expense'], [250, 'income']]);
  });

  it('honors a reversed Credit / Debit column order', () => {
    expect(rows(`Savings account
Date          Description          Credit          Debit
11/01/2024    TEST GROCER          0.00          12.34
11/02/2024    TEST PAYROLL          250.00          0.00`).map(r => [r.amount, r.transaction_type])).toEqual([[12.34, 'expense'], [250, 'income']]);
  });

  it('preserves the opposite convention for credit card purchases and payments', () => {
    expect(rows(`Credit card statement
Checking account used for payments: TEST ONLY
Standard Purchases
Trans. date  Post date  Description  Amount
11/01 11/02 TEST GROCER $12.34
11/03 11/04 ONLINE PAYMENT -$250.00`).map(r => [r.amount, r.transaction_type])).toEqual([
      [12.34, 'expense'], [250, 'income'],
    ]);
  });

  it('does not silently reinterpret an unrecognized bank statement as a credit card', () => {
    expect(rows(`Checking account statement
11/01/2024    TEST GROCER          -12.34`)).toEqual([]);
  });
});


describe('uploaded PDF bytes', () => {
  it('extracts a real uploaded statement without depending on Node Buffer allocation', async () => {
    const bytes = await readFile(new URL('../../../scripts/fixtures/pdf-import-synthetic.pdf', import.meta.url));
    const result = await parsePDFFile(new File([new Uint8Array(bytes)], 'synthetic.pdf', { type: 'application/pdf' }));
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
    expect(result.transactions.map(({ date, amount, transaction_type }) => [date, amount, transaction_type])).toEqual([
      ['2026-11-01', 12.34, 'expense'], ['2026-11-03', 8.9, 'expense'],
      ['2026-11-05', 250, 'income'], ['2026-11-07', 4.56, 'expense'],
    ]);
  });
});
