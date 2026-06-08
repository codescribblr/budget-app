/**
 * Run with: npx tsx src/lib/recurring-transactions/__tests__/detection-v2.test.ts
 */
import assert from 'node:assert/strict';
import { detectRecurringTransactionsFromData } from '../detect-from-data';
import type { DetectionTransaction } from '../types';

function txn(
  partial: Partial<DetectionTransaction> & Pick<DetectionTransaction, 'id' | 'date' | 'total_amount' | 'merchant_group_id' | 'merchant_name'>
): DetectionTransaction {
  return {
    description: partial.description || partial.merchant_name,
    transaction_type: partial.transaction_type || 'expense',
    account_id: partial.account_id ?? 1,
    credit_card_id: partial.credit_card_id ?? null,
    splits: partial.splits || [
      { category_id: 1, amount: partial.total_amount, category_name: 'Subscriptions', is_system: false, is_buffer: false },
    ],
    ...partial,
  };
}

function monthlyDates(startYear: number, startMonth: number, count: number, day = 8): string[] {
  return Array.from({ length: count }, (_, i) => {
    const month = startMonth + i;
    const year = startYear + Math.floor((month - 1) / 12);
    const m = ((month - 1) % 12) + 1;
    return `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });
}

// Netflix — 4 monthly occurrences (recent dates for recency gate)
{
  const now = new Date();
  const dates = monthlyDates(now.getFullYear(), now.getMonth() - 2, 4);
  const transactions = dates.map((date, i) =>
    txn({
      id: i + 1,
      date,
      total_amount: 15.99,
      merchant_group_id: 1,
      merchant_name: 'NETFLIX.COM',
      description: 'NETFLIX.COM SUBSCRIPTION',
      splits: [{ category_id: 1, amount: 15.99, category_name: 'Subscriptions', is_system: false, is_buffer: false }],
    })
  );
  const patterns = detectRecurringTransactionsFromData(transactions);
  assert.ok(patterns.length >= 1, 'Netflix should be detected');
  assert.equal(patterns[0].chargeClass, 'fixed_bill');
  console.log('✓ Netflix monthly subscription detected');
}

// McDonald's weekly — should reject
{
  const base = new Date();
  base.setDate(base.getDate() - 42);
  const transactions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i * 7);
    return txn({
      id: 100 + i,
      date: d.toISOString().split('T')[0],
      total_amount: 9.5 + (i % 3),
      merchant_group_id: 2,
      merchant_name: 'MCDONALD\'S',
      splits: [{ category_id: 2, amount: 10, category_name: 'Dining', is_system: false, is_buffer: false }],
    });
  });
  const patterns = detectRecurringTransactionsFromData(transactions);
  assert.equal(patterns.length, 0, 'McDonald\'s weekly should be rejected');
  console.log('✓ McDonald\'s weekly rejected');
}

// City Electric variable utility — 4+ months
{
  const amounts = [98, 275, 112, 89, 260, 105];
  const now = new Date();
  const dates = monthlyDates(now.getFullYear(), now.getMonth() - (amounts.length - 1), amounts.length, 12);
  const transactions = amounts.map((amount, i) =>
    txn({
      id: 200 + i,
      date: dates[i],
      total_amount: amount,
      merchant_group_id: 3,
      merchant_name: 'CITY ELECTRIC',
      description: 'CITY ELECTRIC POWER',
      splits: [{ category_id: 3, amount, category_name: 'Utilities', is_system: false, is_buffer: false }],
    })
  );
  const patterns = detectRecurringTransactionsFromData(transactions);
  assert.ok(patterns.length >= 1, 'City Electric variable bill should be detected');
  assert.equal(patterns[0].chargeClass, 'variable_bill');
  assert.equal(patterns[0].isAmountVariable, true);
  console.log('✓ City Electric variable utility detected');
}

// Single explicit-text occurrence
{
  const patterns = detectRecurringTransactionsFromData([
    txn({
      id: 300,
      date: new Date().toISOString().split('T')[0],
      total_amount: 15.99,
      merchant_group_id: 1,
      merchant_name: 'NETFLIX.COM',
      description: 'NETFLIX SUBSCRIPTION',
    }),
  ]);
  assert.ok(patterns.length >= 1, 'Single explicit subscription should surface');
  assert.equal(patterns[0].occurrenceCount, 1);
  assert.equal(patterns[0].nextExpectedDate, null);
  console.log('✓ Single explicit-text Netflix detected');
}

console.log('\nAll detection V2 tests passed.');
