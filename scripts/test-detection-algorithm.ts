#!/usr/bin/env tsx
/**
 * Test script that runs the actual detection algorithm against real data
 * 
 * Usage: tsx scripts/test-detection-algorithm.ts
 */

import { testFixture, getTransactionsForMerchant } from '../src/lib/recurring-transactions/test-fixtures';
import type { RecurringPattern } from '../src/lib/recurring-transactions/detection-testable';

// Import the testable version that works with data directly
import { detectRecurringTransactionsFromData } from '../src/lib/recurring-transactions/detection-testable';

interface DetectionResult {
  detected: RecurringPattern[];
  expected: Array<{
    merchantGroupId: number;
    merchantName: string;
    frequency: string | null;
    shouldDetect: boolean;
    expectedAmounts?: number[]; // For multi-subscription merchants
  }>;
  matches: Array<{
    expected: any;
    detected: RecurringPattern[];
    status: 'matched' | 'partial' | 'missing' | 'extra';
  }>;
}

/**
 * Run detection algorithm and compare with expected results
 */
async function testDetectionAlgorithm(): Promise<DetectionResult> {
  console.log('🔍 Running Detection Algorithm Test\n');
  console.log(`📊 Test Data: ${testFixture.metadata.transactionCount} transactions\n`);

  // Get expected patterns from analysis
  const expectedPatterns = testFixture.analysis
    .filter(a => a.shouldDetect)
    .map(a => {
      // Check if this merchant has multiple subscription amounts
      const merchantTransactions = getTransactionsForMerchant(testFixture, a.merchantGroupId);
      const amountGroups = new Map<number, typeof merchantTransactions>();
      
      merchantTransactions.forEach(tx => {
        const amount = Math.round(Math.abs(tx.total_amount) * 100) / 100;
        if (!amountGroups.has(amount)) {
          amountGroups.set(amount, []);
        }
        amountGroups.get(amount)!.push(tx);
      });

      const distinctAmounts = Array.from(amountGroups.entries())
        .filter(([_, txs]) => txs.length >= 3)
        .map(([amount]) => amount)
        .sort((a, b) => a - b);

      return {
        merchantGroupId: a.merchantGroupId,
        merchantName: a.merchantName,
        frequency: a.frequency,
        shouldDetect: a.shouldDetect,
        expectedAmounts: distinctAmounts.length >= 2 ? distinctAmounts : undefined,
      };
    });

  console.log(`✅ Expected to detect: ${expectedPatterns.length} merchants\n`);

  // Run detection algorithm
  console.log('🔎 Running detection algorithm...\n');
  
  let detectedPatterns: RecurringPattern[] = [];
  try {
    // Use the testable version that accepts transactions directly
    detectedPatterns = await detectRecurringTransactionsFromData(
      testFixture.transactions.map(tx => ({
        ...tx,
        transaction_splits: [], // Add empty splits array if needed
      })),
      12 // 12 month lookback
    );
  } catch (error: any) {
    console.error('❌ Error running detection:', error.message);
    console.error(error.stack);
    return {
      detected: [],
      expected: expectedPatterns,
      matches: [],
    };
  }

  console.log(`🔍 Detected: ${detectedPatterns.length} patterns\n`);

  // Compare detected vs expected
  const matches: DetectionResult['matches'] = [];

  // Group detected patterns by merchant
  const detectedByMerchant = new Map<number, RecurringPattern[]>();
  detectedPatterns.forEach(pattern => {
    if (!detectedByMerchant.has(pattern.merchantGroupId)) {
      detectedByMerchant.set(pattern.merchantGroupId, []);
    }
    detectedByMerchant.get(pattern.merchantGroupId)!.push(pattern);
  });

  // Check each expected pattern
  for (const expected of expectedPatterns) {
    const detected = detectedByMerchant.get(expected.merchantGroupId) || [];

    if (detected.length === 0) {
      matches.push({
        expected,
        detected: [],
        status: 'missing',
      });
    } else if (expected.expectedAmounts && expected.expectedAmounts.length > 1) {
      // Multi-subscription merchant - check if split correctly
      const detectedAmounts = detected.map(p => Math.round(p.expectedAmount * 100) / 100).sort((a, b) => a - b);
      const expectedAmounts = expected.expectedAmounts;
      
      const allAmountsMatch = expectedAmounts.every(amt => 
        detectedAmounts.some(detAmt => Math.abs(detAmt - amt) < 0.01)
      ) && detectedAmounts.length === expectedAmounts.length;

      matches.push({
        expected,
        detected,
        status: allAmountsMatch ? 'matched' : 'partial',
      });
    } else {
      // Single pattern expected
      matches.push({
        expected,
        detected,
        status: detected.length === 1 ? 'matched' : detected.length > 1 ? 'extra' : 'missing',
      });
    }
  }

  // Check for extra detections (merchants detected but not expected)
  const expectedMerchantIds = new Set(expectedPatterns.map(e => e.merchantGroupId));
  for (const [merchantId, patterns] of detectedByMerchant.entries()) {
    if (!expectedMerchantIds.has(merchantId)) {
      matches.push({
        expected: {
          merchantGroupId: merchantId,
          merchantName: patterns[0].merchantName,
          frequency: null,
          shouldDetect: false,
        },
        detected: patterns,
        status: 'extra',
      });
    }
  }

  return {
    detected: detectedPatterns,
    expected: expectedPatterns,
    matches,
  };
}

/**
 * Print test results
 */
function printResults(results: DetectionResult) {
  console.log('\n📋 Detection Results:\n');

  const matched = results.matches.filter(m => m.status === 'matched');
  const partial = results.matches.filter(m => m.status === 'partial');
  const missing = results.matches.filter(m => m.status === 'missing');
  const extra = results.matches.filter(m => m.status === 'extra');

  console.log('✅ Correctly Detected:');
  matched.forEach(m => {
    if (m.expected.expectedAmounts) {
      console.log(`  ✅ ${m.expected.merchantName}: ${m.detected.length} patterns (multi-subscription)`);
      m.detected.forEach(p => {
        console.log(`     - $${p.expectedAmount.toFixed(2)} (${p.frequency}, ${p.occurrenceCount} occurrences)`);
      });
    } else {
      const pattern = m.detected[0];
      console.log(`  ✅ ${m.expected.merchantName}: $${pattern.expectedAmount.toFixed(2)} (${pattern.frequency}, ${pattern.occurrenceCount} occurrences)`);
    }
  });

  if (partial.length > 0) {
    console.log('\n⚠️  Partially Detected (multi-subscription split issue):');
    partial.forEach(m => {
      console.log(`  ⚠️  ${m.expected.merchantName}`);
      console.log(`     Expected: ${m.expected.expectedAmounts?.length || 1} pattern(s) with amounts: ${m.expected.expectedAmounts?.map(a => `$${a.toFixed(2)}`).join(', ')}`);
      console.log(`     Detected: ${m.detected.length} pattern(s)`);
      m.detected.forEach(p => {
        console.log(`       - $${p.expectedAmount.toFixed(2)} (${p.frequency}, ${p.occurrenceCount} occurrences)`);
      });
    });
  }

  if (missing.length > 0) {
    console.log('\n❌ Missing (should detect but didn\'t):');
    missing.forEach(m => {
      console.log(`  ❌ ${m.expected.merchantName} (${m.expected.frequency || 'unknown frequency'})`);
    });
  }

  if (extra.length > 0) {
    console.log('\n➕ Extra (detected but not expected):');
    extra.forEach(m => {
      console.log(`  ➕ ${m.detected[0].merchantName}: ${m.detected.length} pattern(s)`);
      m.detected.forEach(p => {
        console.log(`     - $${p.expectedAmount.toFixed(2)} (${p.frequency}, ${p.occurrenceCount} occurrences)`);
      });
    });
  }

  console.log('\n📊 Summary:');
  console.log(`  Expected: ${results.expected.length} merchants`);
  console.log(`  Detected: ${results.detected.length} patterns`);
  console.log(`  Correctly Matched: ${matched.length} ✅`);
  console.log(`  Partially Matched: ${partial.length} ⚠️`);
  console.log(`  Missing: ${missing.length} ❌`);
  console.log(`  Extra: ${extra.length} ➕`);

  const accuracy = results.expected.length > 0
    ? ((matched.length + partial.length * 0.5) / results.expected.length * 100).toFixed(1)
    : '0';
  console.log(`  Accuracy: ${accuracy}%`);
}

// Run if executed directly
if (require.main === module) {
  testDetectionAlgorithm()
    .then(results => {
      printResults(results);
      const failed = results.matches.filter(m => m.status === 'missing').length;
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { testDetectionAlgorithm, printResults };
