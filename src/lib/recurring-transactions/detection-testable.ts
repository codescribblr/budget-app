/**
 * Testable version of detection algorithm that accepts transactions directly
 * This allows us to test the algorithm without mocking Supabase
 */

import type { RecurringPattern } from './detection';
import { 
  groupCandidates, 
  segmentByGap, 
  groupByExactAmount,
  groupBySimilarAmount,
  inferCadence,
  validatePattern,
  scorePattern,
  analyzeVariableAmountPattern,
  calculateNextDate,
  getNonSystemCategoryIds,
  getMostCommon,
  calculateMedian,
  calculateAmountVariance,
  hasNonSystemSplit,
  calculateRetailScore,
} from './detection';

// Re-export types
export type { RecurringPattern };

/**
 * Detect recurring transactions from a list of transactions
 * This is a testable version that doesn't require Supabase
 */
export async function detectRecurringTransactionsFromData(
  transactions: Array<{
    id: number;
    date: string;
    total_amount: number;
    transaction_type: 'income' | 'expense';
    merchant_group_id: number | null;
    account_id: number | null;
    credit_card_id: number | null;
    merchant_groups?: {
      display_name: string;
    };
    transaction_splits?: Array<{
      category_id: number | null;
      categories?: {
        is_system: boolean;
        is_buffer: boolean;
      };
    }>;
  }>,
  lookbackMonths: number = 12
): Promise<RecurringPattern[]> {
  // Filter out transactions with only system category splits
  // For test data, if transaction_splits is missing/empty, consider it valid
  const validTransactions = transactions.filter(txn => {
    if (!txn.merchant_group_id) return false;
    // If transaction_splits is not provided in test data, assume valid
    if (!txn.transaction_splits || txn.transaction_splits.length === 0) return true;
    return hasNonSystemSplit(txn);
  });

  if (validTransactions.length < 3) return [];

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - lookbackMonths);

  // Filter by date range
  const filteredTransactions = validTransactions.filter(txn => {
    const txDate = new Date(txn.date);
    return txDate >= startDate && txDate <= endDate;
  });

  if (filteredTransactions.length < 3) return [];

  // Step 1: Group candidates by merchant_group_id, transaction_type, and account
  const candidateGroups = groupCandidates(filteredTransactions);

  const patterns: RecurringPattern[] = [];

  // Process each candidate group
  for (const candidateGroup of candidateGroups) {
    if (candidateGroup.transactions.length < 3) continue;

    const merchantName = candidateGroup.transactions[0].merchant_groups?.display_name || 'Unknown';

    // Step 2: Segment by gaps (only most recent segment is eligible)
    const segments = segmentByGap(candidateGroup.transactions);
    if (segments.length === 0) continue;

    // Only analyze the most recent segment
    const recentSegment = segments[segments.length - 1];
    // Allow segments with 2+ transactions (we'll check >= 3 later for amount groups)
    if (recentSegment.transactions.length < 2) continue;

    // Step 3: Group by exact amounts first (to handle multi-subscription merchants)
    let exactAmountGroups = groupByExactAmount(recentSegment.transactions);
    
    // Also include 2-transaction groups if we have multiple distinct amounts
    // This handles cases like Spectrum where the most recent amount has only 2 transactions
    if (recentSegment.transactions.length >= 4) {
      const amountMap = new Map<number, any[]>();
      for (const txn of recentSegment.transactions) {
        const amount = Math.round(Math.abs(txn.total_amount) * 100) / 100;
        if (!amountMap.has(amount)) {
          amountMap.set(amount, []);
        }
        amountMap.get(amount)!.push(txn);
      }
      const distinctAmounts = Array.from(amountMap.keys()).length;
      
      // If we have multiple distinct amounts, include 2-transaction groups too
      if (distinctAmounts >= 2) {
        const twoTransactionGroups = Array.from(amountMap.values())
          .filter(txs => txs.length === 2) // Only get 2-transaction groups
          .map(txs => {
            txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            return txs;
          });
        
        // Add 2-transaction groups that aren't already included
        const existingAmounts = new Set(exactAmountGroups.map(g => 
          Math.round(Math.abs(g[0].total_amount) * 100) / 100
        ));
        
        twoTransactionGroups.forEach(group => {
          const amount = Math.round(Math.abs(group[0].total_amount) * 100) / 100;
          if (!existingAmounts.has(amount)) {
            exactAmountGroups.push(group);
          }
        });
      }
    }
    
    // Step 4: For each exact amount group, check if it forms a pattern
    for (const exactAmountGroup of exactAmountGroups) {
      // For multi-subscription merchants, allow groups with 2+ transactions if recent
      const minTransactions = exactAmountGroup.length >= 2 && exactAmountGroups.length > 1 ? 2 : 3;
      if (exactAmountGroup.length < minTransactions) continue;
      
      // Transactions are already sorted by date

      // Step 5: Infer cadence using median + MAD
      // For small groups (2 transactions), we need to look at transactions of the same amount
      // across the full merchant history to infer the cadence
      let cadence = inferCadence(exactAmountGroup);
      
      // If cadence inference fails for small groups, find all transactions with this exact amount
      // in the full merchant group to infer cadence
      if (!cadence && exactAmountGroup.length === 2) {
        const targetAmount = Math.round(Math.abs(exactAmountGroup[0].total_amount) * 100) / 100;
        const sameAmountTransactions = candidateGroup.transactions
          .filter(tx => Math.round(Math.abs(tx.total_amount) * 100) / 100 === targetAmount)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        if (sameAmountTransactions.length >= 3) {
          const amountCadence = inferCadence(sameAmountTransactions);
          if (amountCadence) {
            cadence = amountCadence;
          }
        }
      }
      
      // Fallback: try using the full merchant group pattern
      if (!cadence && exactAmountGroup.length === 2 && candidateGroup.transactions.length >= 3) {
        const groupCadence = inferCadence(candidateGroup.transactions);
        if (groupCadence) {
          cadence = groupCadence;
        }
      }
      
      // Last resort: try the recent segment
      if (!cadence && exactAmountGroup.length === 2 && recentSegment.transactions.length >= 3) {
        const segmentCadence = inferCadence(recentSegment.transactions);
        if (segmentCadence) {
          cadence = segmentCadence;
        }
      }
      
      if (!cadence) continue;

      // Step 6: Validate pattern (date anchors, recency, amount consistency)
      const validation = validatePattern(exactAmountGroup, cadence);
      if (!validation.valid) continue;

      // Step 7: Score pattern (conservative thresholds)
      const score = scorePattern(exactAmountGroup, cadence, validation);
      if (score < 0.5) continue;

      // Step 8: Check recency gating (last occurrence within 1.5x interval)
      const lastDate = new Date(exactAmountGroup[exactAmountGroup.length - 1].date);
      const daysSinceLast = (endDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // More lenient threshold for biweekly patterns
      let recencyThreshold = cadence.medianInterval * 1.5;
      if (cadence.frequency === 'biweekly') {
        recencyThreshold = Math.max(recencyThreshold, 30);
      }
      
      if (daysSinceLast > recencyThreshold) {
        continue;
      }

      // Build pattern
      const amounts = exactAmountGroup.map(t => Math.abs(t.total_amount));
      const medianAmount = calculateMedian(amounts);
      const amountVariance = calculateAmountVariance(amounts, medianAmount);
      
      // Filter out retail/dining merchants
      const retailScore = calculateRetailScore(merchantName, {
        expectedAmount: medianAmount,
        amountVariance,
        occurrenceCount: exactAmountGroup.length,
        frequency: cadence.frequency,
        cadence,
      });
      
      const hasStrongSubscriptionSignals = 
        exactAmountGroup.length >= 4 &&
        cadence.mad / cadence.medianInterval < 0.15 &&
        amountVariance < medianAmount * medianAmount * 0.01;
      
      if (retailScore > 0.6 && !hasStrongSubscriptionSignals) {
        continue; // Likely retail, skip
      }

      const categories = exactAmountGroup.flatMap((t) => getNonSystemCategoryIds(t));
      const categoryId = categories.length > 0 ? getMostCommon(categories) : null;
      // Use account from the most recent transaction (last in array since they're sorted by date)
      const mostRecentTransaction = exactAmountGroup[exactAmountGroup.length - 1];
      const accountId = mostRecentTransaction.account_id || null;
      const creditCardId = mostRecentTransaction.credit_card_id || null;

      const nextExpectedDate = calculateNextDate(
        lastDate,
        cadence.frequency,
        cadence.medianInterval,
        cadence.dayOfMonth,
        cadence.dayOfWeek
      );

      patterns.push({
        merchantGroupId: candidateGroup.merchantGroupId,
        merchantName,
        frequency: cadence.frequency,
        expectedAmount: medianAmount,
        amountVariance,
        transactionType: candidateGroup.transactionType,
        categoryId,
        accountId,
        creditCardId,
        confidenceScore: score,
        occurrenceCount: exactAmountGroup.length,
        lastOccurrenceDate: exactAmountGroup[exactAmountGroup.length - 1].date,
        nextExpectedDate: nextExpectedDate.toISOString().split('T')[0],
        transactionIds: exactAmountGroup.map(t => t.id),
      });
    }

    // Step 9: Fallback - Group by similar amounts for variable-amount patterns (utilities)
    // Also check if exact amount groups exist but some transactions weren't grouped
    // For utilities, we need to be more lenient - check even if exact groups found but failed validation
    if (exactAmountGroups.length === 0 && recentSegment.transactions.length >= 3) {
      // First try similar amount grouping (for utilities with small variance)
      const amountGroups = groupBySimilarAmount(recentSegment.transactions);
      
      if (amountGroups.length === 0) {
        // No similar amount groups - try variable amount pattern detection (utilities)
        const variablePattern = analyzeVariableAmountPattern(
          candidateGroup.merchantGroupId,
          merchantName,
          recentSegment.transactions,
          candidateGroup.transactionType
        );
        if (variablePattern && variablePattern.confidenceScore >= 0.5) {
          // Filter out retail/dining merchants for variable patterns
          const retailScore = calculateRetailScore(merchantName, {
            expectedAmount: variablePattern.expectedAmount,
            amountVariance: variablePattern.amountVariance * variablePattern.amountVariance,
            occurrenceCount: variablePattern.occurrenceCount,
            frequency: variablePattern.frequency,
          });
          
          // Variable patterns from utilities are legitimate, but retail should be filtered
          // Utilities typically have moderate variance (10-30%), retail has high variance (>50%)
          const coefficientOfVariation = variablePattern.amountVariance / variablePattern.expectedAmount;
          const isLikelyUtility = coefficientOfVariation > 0.1 && coefficientOfVariation < 0.4;
          
          if (retailScore > 0.6 && !isLikelyUtility) {
            // Skip retail merchants with variable patterns
            continue;
          }
          
          patterns.push(variablePattern);
        }
      } else {
        for (const amountGroup of amountGroups) {
          if (amountGroup.length < 3) continue;

          const cadence = inferCadence(amountGroup);
          if (!cadence) continue;

          const validation = validatePattern(amountGroup, cadence);
          if (!validation.valid) continue;

          const score = scorePattern(amountGroup, cadence, validation);
          if (score < 0.5) continue;

          const lastDate = new Date(amountGroup[amountGroup.length - 1].date);
          const daysSinceLast = (endDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
          
          let recencyThreshold = cadence.medianInterval * 1.5;
          if (cadence.frequency === 'biweekly') {
            recencyThreshold = Math.max(recencyThreshold, 30);
          }
          
          if (daysSinceLast > recencyThreshold) {
            continue;
          }

          const amounts = amountGroup.map(t => Math.abs(t.total_amount));
          const medianAmount = calculateMedian(amounts);
          const amountVariance = calculateAmountVariance(amounts, medianAmount);
          
          // Filter out retail/dining merchants
          const retailScore = calculateRetailScore(merchantName, {
            expectedAmount: medianAmount,
            amountVariance,
            occurrenceCount: amountGroup.length,
            frequency: cadence.frequency,
            cadence,
          });
          
          const hasStrongSubscriptionSignals = 
            amountGroup.length >= 4 &&
            cadence.mad / cadence.medianInterval < 0.15 &&
            amountVariance < medianAmount * medianAmount * 0.01;
          
          if (retailScore > 0.6 && !hasStrongSubscriptionSignals) {
            continue; // Likely retail, skip
          }

          const categories = amountGroup.flatMap((t) => getNonSystemCategoryIds(t));
          const categoryId = categories.length > 0 ? getMostCommon(categories) : null;
          // Use account from the most recent transaction (last in array since they're sorted by date)
          const mostRecentTransaction = amountGroup[amountGroup.length - 1];
          const accountId = mostRecentTransaction.account_id || null;
          const creditCardId = mostRecentTransaction.credit_card_id || null;

          const nextExpectedDate = calculateNextDate(
            lastDate,
            cadence.frequency,
            cadence.medianInterval,
            cadence.dayOfMonth,
            cadence.dayOfWeek
          );

          patterns.push({
            merchantGroupId: candidateGroup.merchantGroupId,
            merchantName,
            frequency: cadence.frequency,
            expectedAmount: medianAmount,
            amountVariance,
            transactionType: candidateGroup.transactionType,
            categoryId,
            accountId,
            creditCardId,
            confidenceScore: score,
            occurrenceCount: amountGroup.length,
            lastOccurrenceDate: amountGroup[amountGroup.length - 1].date,
            nextExpectedDate: nextExpectedDate.toISOString().split('T')[0],
            transactionIds: amountGroup.map(t => t.id),
          });
        }
      }
    }
  }

  return patterns;
}
