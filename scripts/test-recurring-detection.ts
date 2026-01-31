#!/usr/bin/env tsx
/**
 * Test runner for recurring transaction detection
 * 
 * Usage: tsx scripts/test-recurring-detection.ts
 */

import { runDetectionTests } from '../src/lib/recurring-transactions/__tests__/detection.test';

const results = runDetectionTests();

console.log('\n📋 Test Results:\n');

console.log('✅ Should Detect Merchants:');
results.results.shouldDetect.forEach(r => {
  const icon = r.passed ? '✅' : '❌';
  console.log(`  ${icon} ${r.message}`);
  if (r.details && !r.passed) {
    console.log(`     Details:`, JSON.stringify(r.details, null, 2));
  }
});

console.log('\n🔀 Multi-Subscription Merchants:');
results.results.multiSubscription.forEach(r => {
  console.log(`  ✅ ${r.message}`);
  if (r.details) {
    console.log(`     Amounts: ${r.details.amounts.join(', ')}`);
    console.log(`     Counts: ${r.details.counts.join(', ')}`);
    console.log(`     Note: ${r.details.note}`);
  }
});

console.log('\n🚫 Should NOT Detect Merchants (sample):');
results.results.shouldNotDetect.slice(0, 10).forEach(r => {
  console.log(`  ✅ ${r.message}`);
});
if (results.results.shouldNotDetect.length > 10) {
  console.log(`  ... and ${results.results.shouldNotDetect.length - 10} more`);
}

console.log('\n📊 Summary:');
console.log(`  Total Tests: ${results.summary.total}`);
console.log(`  Passed: ${results.summary.passed} ✅`);
console.log(`  Failed: ${results.summary.failed} ${results.summary.failed > 0 ? '❌' : ''}`);

if (results.summary.failed > 0) {
  console.log('\n❌ Some tests failed. Review the details above.');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
