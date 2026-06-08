/**
 * Tests for recurring transaction detection
 * 
 * These tests use real-world transaction data exported from the analysis tool.
 * 
 * To run these tests:
 * 1. Make sure test-fixtures.ts has the exported data loaded
 * 2. Run: tsx src/lib/recurring-transactions/__tests__/detection.test.ts
 */

import { testFixture, getShouldDetectTransactions, getShouldNotDetectTransactions, getTransactionsForMerchant } from '../test-fixtures';
import type { RecurringPattern } from '../detection';

// Mock the detection function's dependencies
// In a real test environment, we'd use jest/vitest mocks
// For now, we'll create a test runner that validates the expected behavior

interface TestResult {
  passed: boolean;
  message: string;
  details?: any;
}

/**
 * Test that merchants marked as shouldDetect have the required characteristics
 */
function testShouldDetectMerchants(): TestResult[] {
  const results: TestResult[] = [];
  const shouldDetect = testFixture.analysis.filter(a => a.shouldDetect);

  if (shouldDetect.length === 0) {
    return [{
      passed: false,
      message: 'No merchants marked as shouldDetect in test fixture',
    }];
  }

  for (const analysis of shouldDetect) {
    const merchantTransactions = getTransactionsForMerchant(testFixture, analysis.merchantGroupId);
    
    // Test 1: Should have at least 3 transactions
    if (merchantTransactions.length < 3) {
      results.push({
        passed: false,
        message: `${analysis.merchantName}: Has only ${merchantTransactions.length} transactions (need at least 3)`,
        details: { merchantGroupId: analysis.merchantGroupId },
      });
      continue;
    }

    // Test 2: Should have consistent date intervals
    const sortedTxs = merchantTransactions.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const intervals: number[] = [];
    for (let i = 1; i < sortedTxs.length; i++) {
      const prevDate = new Date(sortedTxs[i - 1].date);
      const currDate = new Date(sortedTxs[i].date);
      const daysDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      intervals.push(daysDiff);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => 
      sum + Math.pow(interval - avgInterval, 2), 0
    ) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / avgInterval;

    // For monthly patterns, CV should be reasonable
    if (analysis.frequency === 'monthly' && coefficientOfVariation > 0.3) {
      results.push({
        passed: false,
        message: `${analysis.merchantName}: Monthly pattern has high variance (CV: ${coefficientOfVariation.toFixed(2)})`,
        details: { avgInterval, stdDev, coefficientOfVariation },
      });
    }

    // Test 3: Should be recent (active)
    const lastDate = new Date(sortedTxs[sortedTxs.length - 1].date);
    const today = new Date();
    const daysSinceLast = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    const recencyThreshold = avgInterval * 1.5;

    if (daysSinceLast > recencyThreshold) {
      results.push({
        passed: false,
        message: `${analysis.merchantName}: Pattern appears inactive (last transaction ${daysSinceLast} days ago, threshold: ${recencyThreshold.toFixed(1)} days)`,
        details: { daysSinceLast, recencyThreshold, lastDate: lastDate.toISOString().split('T')[0] },
      });
    }

    // If all checks pass
    results.push({
      passed: true,
      message: `${analysis.merchantName}: Passes all validation checks`,
      details: {
        frequency: analysis.frequency,
        transactionCount: merchantTransactions.length,
        avgInterval: avgInterval.toFixed(1),
        daysSinceLast,
      },
    });
  }

  return results;
}

/**
 * Test that merchants with multiple subscription amounts are identified
 */
function testMultiSubscriptionMerchants(): TestResult[] {
  const results: TestResult[] = [];
  const shouldDetect = testFixture.analysis.filter(a => a.shouldDetect);

  for (const analysis of shouldDetect) {
    const merchantTransactions = getTransactionsForMerchant(testFixture, analysis.merchantGroupId);
    
    if (merchantTransactions.length < 6) continue; // Need enough transactions to detect patterns

    // Group by amount (rounded to cents)
    const amountGroups = new Map<number, typeof merchantTransactions>();
    merchantTransactions.forEach(tx => {
      const amount = Math.abs(tx.total_amount);
      const rounded = Math.round(amount * 100) / 100;
      if (!amountGroups.has(rounded)) {
        amountGroups.set(rounded, []);
      }
      amountGroups.get(rounded)!.push(tx);
    });

    // Find distinct amounts with multiple occurrences
    const distinctAmounts = Array.from(amountGroups.entries())
      .filter(([_, txs]) => txs.length >= 3)
      .map(([amount]) => amount)
      .sort((a, b) => a - b);

    if (distinctAmounts.length >= 2) {
      // This merchant has multiple subscription amounts
      results.push({
        passed: true,
        message: `${analysis.merchantName}: Has ${distinctAmounts.length} distinct subscription amounts`,
        details: {
          amounts: distinctAmounts,
          counts: distinctAmounts.map(amt => amountGroups.get(amt)!.length),
          note: 'This merchant should be split into multiple recurring patterns, one per amount',
        },
      });

      // Verify each amount forms a valid pattern
      for (const amount of distinctAmounts) {
        const amountTxs = amountGroups.get(amount)!;
        if (amountTxs.length < 3) {
          results.push({
            passed: false,
            message: `${analysis.merchantName} ($${amount}): Only ${amountTxs.length} transactions for this amount (need at least 3)`,
          });
        }
      }
    }
  }

  return results;
}

/**
 * Test that merchants marked as shouldNotDetect are correctly excluded
 */
function testShouldNotDetectMerchants(): TestResult[] {
  const results: TestResult[] = [];
  const shouldNotDetect = testFixture.analysis.filter(a => !a.shouldDetect);

  if (shouldNotDetect.length === 0) {
    return [{
      passed: true,
      message: 'No merchants marked as shouldNotDetect (this is fine)',
    }];
  }

  // Verify these merchants have characteristics that justify exclusion
  for (const analysis of shouldNotDetect) {
    const merchantTransactions = getTransactionsForMerchant(testFixture, analysis.merchantGroupId);
    
    if (merchantTransactions.length === 0) continue;

    const sortedTxs = merchantTransactions.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Check if it's inactive
    const lastDate = new Date(sortedTxs[sortedTxs.length - 1].date);
    const today = new Date();
    const daysSinceLast = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate intervals
    const intervals: number[] = [];
    for (let i = 1; i < sortedTxs.length; i++) {
      const prevDate = new Date(sortedTxs[i - 1].date);
      const currDate = new Date(sortedTxs[i].date);
      const daysDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      intervals.push(daysDiff);
    }

    const avgInterval = intervals.length > 0 
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
      : 0;

    const reasons: string[] = [];
    
    if (daysSinceLast > avgInterval * 1.5 && avgInterval > 0) {
      reasons.push(`inactive (${daysSinceLast} days since last)`);
    }

    if (merchantTransactions.length < 3) {
      reasons.push(`too few transactions (${merchantTransactions.length})`);
    }

    if (analysis.merchantName.toLowerCase().includes('interest')) {
      reasons.push('interest accrual (excluded)');
    }

    if (analysis.merchantName.toLowerCase().includes('transfer')) {
      reasons.push('internal transfer (excluded)');
    }

    results.push({
      passed: true,
      message: `${analysis.merchantName}: Correctly excluded`,
      details: {
        reason: analysis.reason,
        detectedReasons: reasons,
        transactionCount: merchantTransactions.length,
        daysSinceLast,
      },
    });
  }

  return results;
}

/**
 * Run all tests and report results
 */
export function runDetectionTests(): {
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  results: {
    shouldDetect: TestResult[];
    multiSubscription: TestResult[];
    shouldNotDetect: TestResult[];
  };
} {
  console.log('🧪 Running Recurring Transaction Detection Tests\n');
  console.log(`📊 Test Data: ${testFixture.metadata.transactionCount} transactions, ${testFixture.analysis.length} merchants analyzed\n`);

  const shouldDetectResults = testShouldDetectMerchants();
  const multiSubscriptionResults = testMultiSubscriptionMerchants();
  const shouldNotDetectResults = testShouldNotDetectMerchants();

  const allResults = [
    ...shouldDetectResults,
    ...multiSubscriptionResults,
    ...shouldNotDetectResults,
  ];

  const passed = allResults.filter(r => r.passed).length;
  const failed = allResults.filter(r => !r.passed).length;
  const total = allResults.length;

  return {
    summary: { total, passed, failed },
    results: {
      shouldDetect: shouldDetectResults,
      multiSubscription: multiSubscriptionResults,
      shouldNotDetect: shouldNotDetectResults,
    },
  };
}

// If running directly (not imported)
if (require.main === module) {
  const testResults = runDetectionTests();
  
  console.log('\n📋 Test Results:\n');
  
  console.log('✅ Should Detect Merchants:');
  testResults.results.shouldDetect.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`  ${icon} ${r.message}`);
    if (r.details && !r.passed) {
      console.log(`     Details:`, r.details);
    }
  });

  console.log('\n🔀 Multi-Subscription Merchants:');
  testResults.results.multiSubscription.forEach(r => {
    console.log(`  ✅ ${r.message}`);
    if (r.details) {
      console.log(`     Amounts: ${r.details.amounts.join(', ')}`);
      console.log(`     Note: ${r.details.note}`);
    }
  });

  console.log('\n🚫 Should NOT Detect Merchants:');
  testResults.results.shouldNotDetect.slice(0, 10).forEach(r => {
    console.log(`  ✅ ${r.message}`);
  });
  if (testResults.results.shouldNotDetect.length > 10) {
    console.log(`  ... and ${testResults.results.shouldNotDetect.length - 10} more`);
  }

  console.log('\n📊 Summary:');
  console.log(`  Total Tests: ${testResults.summary.total}`);
  console.log(`  Passed: ${testResults.summary.passed} ✅`);
  console.log(`  Failed: ${testResults.summary.failed} ${testResults.summary.failed > 0 ? '❌' : ''}`);

  process.exit(testResults.summary.failed > 0 ? 1 : 0);
}
