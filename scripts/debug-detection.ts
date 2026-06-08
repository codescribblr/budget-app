#!/usr/bin/env tsx
/**
 * Debug script to investigate why specific merchants aren't being detected
 */

import { testFixture, getTransactionsForMerchant } from '../src/lib/recurring-transactions/test-fixtures';
import { 
  groupCandidates, 
  segmentByGap, 
  groupByExactAmount,
  inferCadence,
  validatePattern,
  scorePattern,
} from '../src/lib/recurring-transactions/detection';

// Debug a specific merchant
function debugMerchant(merchantGroupId: number, merchantName: string) {
  console.log(`\n🔍 Debugging: ${merchantName} (ID: ${merchantGroupId})\n`);

  const transactions = getTransactionsForMerchant(testFixture, merchantGroupId);
  console.log(`Total transactions: ${transactions.length}`);

  if (transactions.length === 0) {
    console.log('❌ No transactions found');
    return;
  }

  // Show date range
  const sorted = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  console.log(`Date range: ${sorted[0].date} to ${sorted[sorted.length - 1].date}`);

  // Check date filtering (12 month lookback)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 12);
  console.log(`Lookback window: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

  const inRange = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate >= startDate && txDate <= endDate;
  });
  console.log(`Transactions in 12-month window: ${inRange.length}`);

  if (inRange.length < 3) {
    console.log('❌ Not enough transactions in lookback window');
    return;
  }

  // Group by candidate (using updated logic that doesn't split by account)
  const candidateGroups = groupCandidates(inRange);
  const group = candidateGroups.find(g => g.merchantGroupId === merchantGroupId);
  
  if (!group) {
    console.log('❌ Not found in candidate groups');
    console.log('Available groups:', candidateGroups.map(g => `${g.merchantGroupId}:${g.transactionType}:${g.accountKey}`));
    return;
  }

  console.log(`\n✅ Found in candidate group: ${group.transactions.length} transactions`);
  console.log(`   Account key: ${group.accountKey}`);

  // Segment by gaps
  const segments = segmentByGap(group.transactions);
  console.log(`\nSegments: ${segments.length}`);
  segments.forEach((seg, i) => {
    console.log(`  Segment ${i + 1}: ${seg.transactions.length} transactions, ${seg.startDate.toISOString().split('T')[0]} to ${seg.endDate.toISOString().split('T')[0]}`);
  });

  if (segments.length === 0) {
    console.log('❌ No valid segments');
    return;
  }

  // Check most recent segment
  const recentSegment = segments[segments.length - 1];
  console.log(`\n📅 Most recent segment: ${recentSegment.transactions.length} transactions`);

  if (recentSegment.transactions.length < 3) {
    console.log('❌ Recent segment has < 3 transactions');
    return;
  }

  // Group by exact amount
  let exactAmountGroups = groupByExactAmount(recentSegment.transactions);
  
  // Check if we should use lower threshold for multi-subscription merchants
  if (exactAmountGroups.length === 0 && recentSegment.transactions.length >= 4) {
    const amountMap = new Map<number, any[]>();
    for (const txn of recentSegment.transactions) {
      const amount = Math.round(Math.abs(txn.total_amount) * 100) / 100;
      if (!amountMap.has(amount)) {
        amountMap.set(amount, []);
      }
      amountMap.get(amount)!.push(txn);
    }
    const distinctAmounts = Array.from(amountMap.keys()).length;
    console.log(`\n💰 Amount distribution: ${distinctAmounts} distinct amounts`);
    amountMap.forEach((txs, amount) => {
      console.log(`  $${amount.toFixed(2)}: ${txs.length} transactions`);
    });
    
    if (distinctAmounts >= 2) {
      exactAmountGroups = Array.from(amountMap.values())
        .filter(txs => txs.length >= 2)
        .map(txs => {
          txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          return txs;
        });
      console.log(`\n💰 Using lower threshold (>= 2): ${exactAmountGroups.length} groups`);
    }
  } else {
    console.log(`\n💰 Exact amount groups (>= 3): ${exactAmountGroups.length}`);
  }
  
  exactAmountGroups.forEach((group, i) => {
    const amounts = group.map(t => Math.abs(t.total_amount));
    const uniqueAmounts = [...new Set(amounts.map(a => Math.round(a * 100) / 100))];
    console.log(`  Group ${i + 1}: ${group.length} transactions, amount: $${uniqueAmounts[0].toFixed(2)}`);
  });

  if (exactAmountGroups.length === 0) {
    console.log('❌ No exact amount groups found');
    return;
  }

  // Test each amount group
  for (let i = 0; i < exactAmountGroups.length; i++) {
    const amountGroup = exactAmountGroups[i];
    console.log(`\n🔬 Testing amount group ${i + 1} (${amountGroup.length} transactions):`);

    // Infer cadence
    const cadence = inferCadence(amountGroup);
    if (!cadence) {
      console.log('  ❌ Failed cadence inference');
      continue;
    }
    console.log(`  ✅ Cadence: ${cadence.frequency}, interval: ${cadence.medianInterval.toFixed(1)} days, MAD: ${cadence.mad.toFixed(1)}`);

    // Validate pattern
    const validation = validatePattern(amountGroup, cadence);
    if (!validation.valid) {
      console.log('  ❌ Failed validation');
      continue;
    }
    console.log(`  ✅ Validation passed, date consistency: ${validation.dateConsistency.toFixed(2)}`);

    // Score pattern
    const score = scorePattern(amountGroup, cadence, validation);
    if (score < 0.5) {
      console.log(`  ❌ Score too low: ${score.toFixed(2)} (need >= 0.5)`);
      continue;
    }
    console.log(`  ✅ Score: ${score.toFixed(2)}`);

    // Check recency
    const lastDate = new Date(amountGroup[amountGroup.length - 1].date);
    const daysSinceLast = (endDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    let recencyThreshold = cadence.medianInterval * 1.5;
    if (cadence.frequency === 'biweekly') {
      recencyThreshold = Math.max(recencyThreshold, 30);
    }

    console.log(`  📅 Last transaction: ${lastDate.toISOString().split('T')[0]} (${daysSinceLast.toFixed(1)} days ago)`);
    console.log(`  📅 Threshold: ${recencyThreshold.toFixed(1)} days`);

    if (daysSinceLast > recencyThreshold) {
      console.log(`  ❌ Failed recency check (${daysSinceLast.toFixed(1)} > ${recencyThreshold.toFixed(1)})`);
      continue;
    }
    console.log(`  ✅ Recency check passed`);

    console.log(`\n  ✅✅✅ This amount group WOULD BE DETECTED! ✅✅✅`);
  }
}

// Debug the missing merchants
const missingMerchants = [
  { id: 7296, name: 'Protective Life Insurance' },
  { id: 7468, name: 'Spectrum' },
  { id: 7327, name: 'Duke Energy' },
  { id: 7515, name: 'Pay Greer Cpw' },
];

console.log('🔍 Debugging Missing Detections\n');
console.log('=' .repeat(60));

for (const merchant of missingMerchants) {
  debugMerchant(merchant.id, merchant.name);
  console.log('\n' + '='.repeat(60));
}
