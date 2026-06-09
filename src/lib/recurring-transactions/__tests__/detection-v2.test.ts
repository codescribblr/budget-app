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

// Single explicit-text occurrence (recent)
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
    txn({
      id: 301,
      date: new Date().toISOString().split('T')[0],
      total_amount: 12.99,
      merchant_group_id: 51,
      merchant_name: 'Spotify',
      splits: [
        {
          category_id: 1,
          amount: 12.99,
          category_name: 'Subscriptions',
          is_system: false,
          is_buffer: false,
        },
      ],
    }),
  ]);
  const netflix = patterns.find((pattern) => pattern.merchantName === 'NETFLIX.COM');
  assert.ok(netflix, 'Single explicit subscription should surface when recent');
  assert.equal(netflix.occurrenceCount, 1);
  assert.equal(netflix.nextExpectedDate, null);
  console.log('✓ Single explicit-text Netflix detected');
}

// Yearly subscription with two charges one year apart
{
  const patterns = detectRecurringTransactionsFromData([
    txn({
      id: 350,
      date: '2024-12-30',
      total_amount: 30,
      merchant_group_id: 99,
      merchant_name: 'Nebula',
      description: 'NEBULA SUBSCRIPTION DENVER CO',
    }),
    txn({
      id: 351,
      date: '2025-12-30',
      total_amount: 30,
      merchant_group_id: 99,
      merchant_name: 'Nebula',
      description: 'NEBULA SUBSCRIPTION',
    }),
    txn({
      id: 352,
      date: new Date().toISOString().split('T')[0],
      total_amount: 5,
      merchant_group_id: 51,
      merchant_name: 'Spotify',
      splits: [
        {
          category_id: 1,
          amount: 5,
          category_name: 'Subscriptions',
          is_system: false,
          is_buffer: false,
        },
      ],
    }),
  ]);
  const nebula = patterns.find((pattern) => pattern.merchantName === 'Nebula');
  assert.ok(nebula, 'Yearly subscription with two annual charges should be detected');
  assert.equal(nebula.frequency, 'yearly');
  assert.equal(nebula.occurrenceCount, 2);
  assert.deepEqual(nebula.transactionIds.sort(), [350, 351]);
  console.log('✓ Yearly subscription detected with both charges');
}

// Single explicit-text occurrence (stale) — should not surface
{
  const patterns = detectRecurringTransactionsFromData([
    txn({
      id: 302,
      date: '2024-12-30',
      total_amount: 30,
      merchant_group_id: 99,
      merchant_name: 'Nebula',
      description: 'NEBULA SUBSCRIPTION',
    }),
    txn({
      id: 303,
      date: new Date().toISOString().split('T')[0],
      total_amount: 5,
      merchant_group_id: 51,
      merchant_name: 'Spotify',
      splits: [
        {
          category_id: 1,
          amount: 5,
          category_name: 'Subscriptions',
          is_system: false,
          is_buffer: false,
        },
      ],
    }),
  ]);
  assert.equal(
    patterns.find((pattern) => pattern.merchantName === 'Nebula'),
    undefined,
    'Stale single-occurrence explicit-text patterns should be rejected'
  );
  console.log('✓ Stale single-occurrence explicit-text rejected');
}

// System: merchant groups are excluded (bookkeeping merchants, not budget categories)
{
  const now = new Date();
  const dates = monthlyDates(now.getFullYear(), now.getMonth() - 2, 4);
  const patterns = detectRecurringTransactionsFromData(
    dates.map((date, i) =>
      txn({
        id: 400 + i,
        date,
        total_amount: 150,
        merchant_group_id: 99,
        merchant_name: 'System: Transfer',
        splits: [
          {
            category_id: 10,
            amount: 150,
            category_name: 'JRWDevelopment',
            is_system: false,
            is_buffer: false,
          },
        ],
      })
    )
  );
  assert.equal(patterns.length, 0, 'System: merchant groups should be excluded');
  console.log('✓ System: merchant groups excluded');
}

// Lapsed monthly patterns are rejected when account data is fresh
{
  const patterns = detectRecurringTransactionsFromData([
    txn({
      id: 500,
      date: '2024-10-22',
      total_amount: 804.76,
      merchant_group_id: 50,
      merchant_name: 'Truist Bank',
    }),
    txn({
      id: 501,
      date: '2024-11-27',
      total_amount: 804.76,
      merchant_group_id: 50,
      merchant_name: 'Truist Bank',
    }),
    txn({
      id: 502,
      date: '2025-02-21',
      total_amount: 804.76,
      merchant_group_id: 50,
      merchant_name: 'Truist Bank',
    }),
    txn({
      id: 503,
      date: '2025-03-21',
      total_amount: 804.76,
      merchant_group_id: 50,
      merchant_name: 'Truist Bank',
    }),
    txn({
      id: 600,
      date: new Date().toISOString().split('T')[0],
      total_amount: 12.99,
      merchant_group_id: 51,
      merchant_name: 'Spotify',
      splits: [
        {
          category_id: 1,
          amount: 12.99,
          category_name: 'Subscriptions',
          is_system: false,
          is_buffer: false,
        },
      ],
    }),
  ]);
  assert.equal(
    patterns.find((pattern) => pattern.merchantName === 'Truist Bank'),
    undefined,
    'Lapsed monthly patterns should not be suggested when newer account data exists'
  );
  console.log('✓ Lapsed patterns rejected when account data is fresh');
}

// System category transactions (paycheck, transfers) are excluded
{
  const now = new Date();
  const base = new Date(now);
  base.setDate(base.getDate() - 84);
  const transactions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i * 14);
    return txn({
      id: 700 + i,
      date: d.toISOString().split('T')[0],
      total_amount: 3734.04,
      merchant_group_id: 200,
      merchant_name: 'Sttark',
      description: 'STTARK GR PAYROLL',
      transaction_type: 'income',
      splits: [
        {
          category_id: 99,
          amount: 3734.04,
          category_name: 'Paycheck',
          is_system: true,
          is_buffer: false,
        },
      ],
    });
  });
  transactions.push(
    txn({
      id: 710,
      date: now.toISOString().split('T')[0],
      total_amount: 500,
      merchant_group_id: 201,
      merchant_name: 'Internal Transfer',
      description: 'TRANSFER TO SAVINGS',
      transaction_type: 'expense',
      splits: [
        {
          category_id: 100,
          amount: 500,
          category_name: 'Transfer',
          is_system: true,
          is_buffer: false,
        },
      ],
    })
  );
  const patterns = detectRecurringTransactionsFromData(transactions);
  assert.equal(
    patterns.find((pattern) => pattern.merchantName === 'Sttark'),
    undefined,
    'Payroll in a system category should not be detected'
  );
  assert.equal(
    patterns.find((pattern) => pattern.merchantName === 'Internal Transfer'),
    undefined,
    'Transfers in a system category should not be detected'
  );
  console.log('✓ System category transactions excluded from detection');
}

// Biweekly payroll income in a user category is still detected
{
  const now = new Date();
  const base = new Date(now);
  base.setDate(base.getDate() - 84);
  const transactions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i * 14);
    return txn({
      id: 800 + i,
      date: d.toISOString().split('T')[0],
      total_amount: 3734.04,
      merchant_group_id: 200,
      merchant_name: 'Sttark',
      description: 'STTARK GR PAYROLL',
      transaction_type: 'income',
      splits: [
        {
          category_id: 42,
          amount: 3734.04,
          category_name: 'Salary',
          is_system: false,
          is_buffer: false,
        },
      ],
    });
  });
  const patterns = detectRecurringTransactionsFromData(transactions);
  const payroll = patterns.find((pattern) => pattern.merchantName === 'Sttark');
  assert.ok(payroll, 'Payroll in a user category should be detected');
  assert.equal(payroll.transactionType, 'income');
  assert.equal(payroll.chargeClass, 'income_payroll');
  assert.equal(payroll.frequency, 'biweekly');
  console.log('✓ Biweekly payroll income detected in user category');
}

console.log('\nAll detection V2 tests passed.');
