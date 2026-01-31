/**
 * Test the actual detection algorithm against real data
 * 
 * This test runs the detection algorithm with mocked Supabase data
 * and compares results against expected patterns from the analysis.
 */

import { testFixture, getTransactionsForMerchant } from '../test-fixtures';
import type { RecurringPattern } from '../detection';

// We'll need to create a version that can work with test data
// Since the actual function uses Supabase, we'll create a testable version

/**
 * Test version of detectRecurringTransactions that works with test data
 */
export async function testDetectRecurringTransactions(
  transactions: typeof testFixture.transactions,
  userId: string,
  budgetAccountId: number
): Promise<RecurringPattern[]> {
  // Import the internal functions we need
  // For now, we'll need to extract the core logic or create a testable wrapper
  
  // This is a placeholder - we'll need to either:
  // 1. Refactor detection.ts to accept transactions directly, or
  // 2. Mock Supabase properly, or  
  // 3. Create a test-specific version
  
  throw new Error('This test needs the detection algorithm to be refactored to accept transactions directly, or Supabase needs to be properly mocked');
}

/**
 * Compare detected patterns with expected patterns
 */
export function comparePatterns(
  detected: RecurringPattern[],
  expected: Array<{
    merchantGroupId: number;
    merchantName: string;
    frequency: string | null;
    shouldDetect: boolean;
    expectedAmounts?: number[];
  }>
): {
  matched: number;
  partial: number;
  missing: number;
  extra: number;
  details: Array<{
    merchantName: string;
    status: 'matched' | 'partial' | 'missing' | 'extra';
    expected?: any;
    detected?: RecurringPattern[];
  }>;
} {
  const details: any[] = [];
  const detectedByMerchant = new Map<number, RecurringPattern[]>();
  
  detected.forEach(pattern => {
    if (!detectedByMerchant.has(pattern.merchantGroupId)) {
      detectedByMerchant.set(pattern.merchantGroupId, []);
    }
    detectedByMerchant.get(pattern.merchantGroupId)!.push(pattern);
  });

  let matched = 0;
  let partial = 0;
  let missing = 0;
  const expectedMerchantIds = new Set(expected.map(e => e.merchantGroupId));

  for (const exp of expected) {
    const detected = detectedByMerchant.get(exp.merchantGroupId) || [];

    if (detected.length === 0) {
      missing++;
      details.push({
        merchantName: exp.merchantName,
        status: 'missing' as const,
        expected: exp,
      });
    } else if (exp.expectedAmounts && exp.expectedAmounts.length > 1) {
      // Multi-subscription check
      const detectedAmounts = detected.map(p => Math.round(p.expectedAmount * 100) / 100).sort((a, b) => a - b);
      const expectedAmounts = exp.expectedAmounts;
      
      const allMatch = expectedAmounts.length === detectedAmounts.length &&
        expectedAmounts.every(amt => 
          detectedAmounts.some(detAmt => Math.abs(detAmt - amt) < 0.01)
        );

      if (allMatch) {
        matched++;
        details.push({
          merchantName: exp.merchantName,
          status: 'matched' as const,
          expected: exp,
          detected,
        });
      } else {
        partial++;
        details.push({
          merchantName: exp.merchantName,
          status: 'partial' as const,
          expected: exp,
          detected,
        });
      }
    } else {
      matched++;
      details.push({
        merchantName: exp.merchantName,
        status: 'matched' as const,
        expected: exp,
        detected,
      });
    }
  }

  // Check for extra detections
  let extra = 0;
  for (const [merchantId, patterns] of detectedByMerchant.entries()) {
    if (!expectedMerchantIds.has(merchantId)) {
      extra++;
      details.push({
        merchantName: patterns[0].merchantName,
        status: 'extra' as const,
        detected: patterns,
      });
    }
  }

  return { matched, partial, missing, extra, details };
}
