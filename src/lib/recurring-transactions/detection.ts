import { createClient } from '../supabase/server';
import { getActiveAccountId } from '../account-context';

export interface RecurringPattern {
  merchantGroupId: number;
  merchantName: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'yearly' | 'custom';
  expectedAmount: number;
  amountVariance: number;
  transactionType: 'income' | 'expense';
  categoryId: number | null;
  accountId: number | null;
  creditCardId: number | null;
  confidenceScore: number;
  occurrenceCount: number;
  lastOccurrenceDate: string;
  nextExpectedDate: string;
  transactionIds: number[]; // IDs of transactions that make up this pattern
}

export interface TransactionSegment {
  transactions: any[];
  startDate: Date;
  endDate: Date;
}

export interface CadenceInfo {
  frequency: RecurringPattern['frequency'];
  medianInterval: number;
  mad: number; // Median Absolute Deviation
  dayOfMonth: number | null;
  dayOfWeek: number | null;
}

export function isSystemCategorySplit(split: any): boolean {
  const category = split?.categories;
  return Boolean(category?.is_system || category?.is_buffer);
}

export function hasNonSystemSplit(transaction: any): boolean {
  const splits = transaction.transaction_splits;
  if (!Array.isArray(splits) || splits.length === 0) {
    return true;
  }
  return splits.some((split: any) => !isSystemCategorySplit(split));
}

export function getNonSystemCategoryIds(transaction: any): number[] {
  const splits = transaction.transaction_splits;
  if (!Array.isArray(splits) || splits.length === 0) {
    return [];
  }
  return splits
    .filter((split: any) => !isSystemCategorySplit(split))
    .map((split: any) => split.category_id)
    .filter((id: any) => typeof id === 'number');
}

/**
 * Detect recurring transaction patterns from historical transactions
 * Uses conservative pipeline approach prioritizing accuracy over inclusion
 */
export async function detectRecurringTransactions(
  userId: string,
  budgetAccountId: number,
  lookbackMonths: number = 12 // Conservative default: 12 months
): Promise<RecurringPattern[]> {
  const supabase = await createClient();

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - lookbackMonths);

  // Get all transactions for this account (with pagination to handle > 1000 rows)
  let allTransactions: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        date,
        total_amount,
        transaction_type,
        merchant_group_id,
        account_id,
        credit_card_id,
        merchant_groups (
          display_name
        ),
        transaction_splits (
          category_id,
          amount,
          categories (
            is_system,
            is_buffer
          )
        )
      `)
      .eq('user_id', userId)
      .eq('budget_account_id', budgetAccountId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!transactions || transactions.length === 0) {
      hasMore = false;
      break;
    }

    allTransactions = allTransactions.concat(transactions);
    hasMore = transactions.length === pageSize;
    from += pageSize;
  }

  if (allTransactions.length === 0) {
    console.log(`[Detection] No transactions found for user ${userId}, account ${budgetAccountId}`);
    return [];
  }

  console.log(`[Detection] Fetched ${allTransactions.length} total transactions`);

  // Filter out transactions with only system category splits
  const validTransactions = allTransactions.filter(txn => 
    txn.merchant_group_id && hasNonSystemSplit(txn)
  );

  console.log(`[Detection] ${validTransactions.length} valid transactions (with merchant_group_id and non-system splits)`);

  if (validTransactions.length < 3) {
    console.log(`[Detection] Not enough valid transactions (need at least 3, got ${validTransactions.length})`);
    return [];
  }

  // Step 1: Group candidates by merchant_group_id, transaction_type, and account
  const candidateGroups = groupCandidates(validTransactions);
  
  console.log(`[Detection] Grouped into ${candidateGroups.length} candidate groups`);

  const patterns: RecurringPattern[] = [];

  // Process each candidate group
  for (const group of candidateGroups) {
    if (group.transactions.length < 3) continue;

    const merchantName = group.transactions[0].merchant_groups?.display_name || 'Unknown';

    // Step 2: Segment by gaps (only most recent segment is eligible)
    const segments = segmentByGap(group.transactions);
    if (segments.length === 0) continue;

    // Only analyze the most recent segment
    const recentSegment = segments[segments.length - 1];
    // Allow segments with 2+ transactions (we'll check >= 3 later for amount groups)
    if (recentSegment.transactions.length < 2) continue;

    // Step 3: Group by exact amounts first (to handle multi-subscription merchants)
    // This handles cases like Protective Life Insurance with 2 different subscription amounts
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
      // For small groups (2 transactions), find all transactions with this exact amount
      // in the full merchant group to infer cadence
      let cadence = inferCadence(exactAmountGroup);
      
      // If cadence inference fails for small groups, look at all transactions of this amount
      if (!cadence && exactAmountGroup.length === 2) {
        const targetAmount = Math.round(Math.abs(exactAmountGroup[0].total_amount) * 100) / 100;
        const sameAmountTransactions = group.transactions
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
      if (!cadence && exactAmountGroup.length === 2 && group.transactions.length >= 3) {
        const groupCadence = inferCadence(group.transactions);
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
      if (score < 0.5) continue; // Conservative threshold

      // Step 8: Check recency gating (last occurrence within 1.5x interval)
      const lastDate = new Date(exactAmountGroup[exactAmountGroup.length - 1].date);
      const daysSinceLast = (endDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // More lenient threshold for biweekly patterns (they can have slight variations)
      let recencyThreshold = cadence.medianInterval * 1.5;
      if (cadence.frequency === 'biweekly') {
        recencyThreshold = Math.max(recencyThreshold, 30); // At least 30 days for biweekly
      }
      
      if (daysSinceLast > recencyThreshold) {
        continue; // Too old, not actively recurring
      }

      // Step 8.5: Filter out retail/dining merchants
      const amounts = exactAmountGroup.map(t => Math.abs(t.total_amount));
      const medianAmount = calculateMedian(amounts);
      const amountVariance = calculateAmountVariance(amounts, medianAmount);
      
      const retailScore = calculateRetailScore(merchantName, {
        expectedAmount: medianAmount,
        amountVariance,
        occurrenceCount: exactAmountGroup.length,
        frequency: cadence.frequency,
        cadence,
      });
      
      // Filter out if retail score is high, unless it has very strong subscription signals
      // Strong subscription signals: exact amounts, consistent timing, high occurrence count
      const hasStrongSubscriptionSignals = 
        exactAmountGroup.length >= 4 && // At least 4 occurrences
        cadence.mad / cadence.medianInterval < 0.15 && // Very consistent timing
        amountVariance < medianAmount * medianAmount * 0.01; // Very consistent amounts (< 1% variance)
      
      if (retailScore > 0.6 && !hasStrongSubscriptionSignals) {
        continue; // Likely retail, skip
      }

      // Build pattern (amounts already calculated above for retail filtering)

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
        merchantGroupId: group.merchantGroupId,
        merchantName,
        frequency: cadence.frequency,
        expectedAmount: medianAmount,
        amountVariance,
        transactionType: group.transactionType,
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
    // Only check if we didn't find any exact amount patterns
    // Also check if exact amount groups exist but some transactions weren't grouped (for utilities)
    if (exactAmountGroups.length === 0 && recentSegment.transactions.length >= 3) {
      const amountGroups = groupBySimilarAmount(recentSegment.transactions);
      
      // Check for variable-amount patterns when no exact amount groups are found
      if (amountGroups.length === 0) {
        const variablePattern = analyzeVariableAmountPattern(
          group.merchantGroupId,
          merchantName,
          recentSegment.transactions,
          group.transactionType
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
        // Process similar amount groups (for utilities with small variance)
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
          
          // More lenient threshold for biweekly patterns
          let recencyThreshold = cadence.medianInterval * 1.5;
          if (cadence.frequency === 'biweekly') {
            recencyThreshold = Math.max(recencyThreshold, 30); // At least 30 days for biweekly
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
            merchantGroupId: group.merchantGroupId,
            merchantName,
            frequency: cadence.frequency,
            expectedAmount: medianAmount,
            amountVariance,
            transactionType: group.transactionType,
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

  console.log(`[Detection] Detected ${patterns.length} recurring patterns`);
  return patterns;
}

/**
 * Step 1: Group candidates by merchant_group_id, transaction_type, and account
 */
export function groupCandidates(transactions: any[]): Array<{
  merchantGroupId: number;
  transactionType: 'income' | 'expense';
  accountKey: string; // account_id or credit_card_id
  transactions: any[];
}> {
  const groups = new Map<string, any[]>();

  for (const txn of transactions) {
    // Don't split by account for recurring detection - same merchant should be grouped together
    // regardless of which account it's from (user might have moved accounts)
    const accountKey = 'all'; // Group all accounts together
    
    const key = `${txn.merchant_group_id}:${txn.transaction_type}:${accountKey}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(txn);
  }

  return Array.from(groups.entries()).map(([key, txns]) => {
    const [merchantGroupId, transactionType, accountKey] = key.split(':');
    return {
      merchantGroupId: parseInt(merchantGroupId),
      transactionType: transactionType as 'income' | 'expense',
      accountKey,
      transactions: txns.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    };
  });
}

/**
 * Step 2: Segment transactions by gaps
 * Only the most recent segment is eligible to become an active pattern
 */
export function segmentByGap(transactions: any[]): TransactionSegment[] {
  if (transactions.length < 2) {
    return transactions.length === 1 
      ? [{
          transactions,
          startDate: new Date(transactions[0].date),
          endDate: new Date(transactions[0].date),
        }]
      : [];
  }

  // Calculate intervals
  const intervals: number[] = [];
  for (let i = 1; i < transactions.length; i++) {
    const prevDate = new Date(transactions[i - 1].date);
    const currDate = new Date(transactions[i].date);
    const daysDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    intervals.push(daysDiff);
  }

  const medianInterval = calculateMedian(intervals);
  
  // Determine gap threshold based on frequency
  // For monthly/quarterly: max(2.5 * median, 60 days) - more lenient
  // For weekly/biweekly: max(2.5 * median, 30 days) - more lenient
  // This prevents splitting on normal variations in transaction timing
  let gapThreshold: number;
  if (medianInterval >= 25) {
    gapThreshold = Math.max(2.5 * medianInterval, 60);
  } else {
    gapThreshold = Math.max(2.5 * medianInterval, 30);
  }

  // Split into segments at gaps
  const segments: TransactionSegment[] = [];
  let currentSegment: any[] = [transactions[0]];

  for (let i = 1; i < transactions.length; i++) {
    const interval = intervals[i - 1];
    
    if (interval > gapThreshold) {
      // Gap detected - start new segment
      if (currentSegment.length >= 3) {
        segments.push({
          transactions: currentSegment,
          startDate: new Date(currentSegment[0].date),
          endDate: new Date(currentSegment[currentSegment.length - 1].date),
        });
      }
      currentSegment = [transactions[i]];
    } else {
      currentSegment.push(transactions[i]);
    }
  }

  // Add final segment (even if < 3, we'll check later)
  // This allows us to analyze the most recent segment even if it's small
  if (currentSegment.length >= 2) {
    segments.push({
      transactions: currentSegment,
      startDate: new Date(currentSegment[0].date),
      endDate: new Date(currentSegment[currentSegment.length - 1].date),
    });
  }

  return segments;
}

/**
 * Step 3a: Group transactions by exact amount (rounded to cents)
 * This handles multi-subscription merchants like Protective Life Insurance
 */
export function groupByExactAmount(transactions: any[]): any[][] {
  const groups: any[][] = [];
  const amountMap = new Map<number, any[]>();

  // Group by exact amount (rounded to cents)
  for (const txn of transactions) {
    const amount = Math.round(Math.abs(txn.total_amount) * 100) / 100;
    
    if (!amountMap.has(amount)) {
      amountMap.set(amount, []);
    }
    amountMap.get(amount)!.push(txn);
  }

  // Only return groups with at least 3 transactions
  // Sort by amount for consistent ordering
  const sortedAmounts = Array.from(amountMap.entries()).sort((a, b) => a[0] - b[0]);
  for (const [amount, txs] of sortedAmounts) {
    if (txs.length >= 3) {
      // Sort transactions by date
      txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      groups.push(txs);
    }
  }

  return groups;
}

/**
 * Step 3b: Group transactions by similar amount
 * Conservative: max($5, 5%) variance
 * Used as fallback when exact amounts don't form patterns
 */
export function groupBySimilarAmount(transactions: any[]): any[][] {
  const groups: any[][] = [];
  const processed = new Set<number>();

  for (const txn of transactions) {
    if (processed.has(txn.id)) continue;

    const group = [txn];
    processed.add(txn.id);

    for (const otherTxn of transactions) {
      if (processed.has(otherTxn.id)) continue;

      const amountDiff = Math.abs(txn.total_amount - otherTxn.total_amount);
      const percentDiff = amountDiff / Math.abs(txn.total_amount);
      // More lenient for utilities: max($10, 10%) instead of max($5, 5%)
      const dollarThreshold = Math.max(10, Math.abs(txn.total_amount) * 0.10);

      if (amountDiff <= dollarThreshold || percentDiff <= 0.10) {
        group.push(otherTxn);
        processed.add(otherTxn.id);
      }
    }

    if (group.length >= 3) {
      // Sort transactions by date to ensure most recent is last
      group.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      groups.push(group);
    }
  }

  return groups;
}

/**
 * Step 4: Infer cadence using median interval + MAD (Median Absolute Deviation)
 */
export function inferCadence(transactions: any[]): CadenceInfo | null {
  if (transactions.length < 2) return null;
  
  // For 2 transactions, we can infer basic cadence from the single interval
  if (transactions.length === 2) {
    const prevDate = new Date(transactions[0].date);
    const currDate = new Date(transactions[1].date);
    const daysDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Must be at least 6 days apart to be considered recurring
    if (daysDiff < 6) return null;
    
    // Map to frequency based on interval
    let frequency: RecurringPattern['frequency'];
    if (daysDiff >= 6 && daysDiff <= 8) {
      frequency = 'weekly';
    } else if (daysDiff >= 12 && daysDiff <= 16) {
      frequency = 'biweekly';
    } else if (daysDiff >= 25 && daysDiff <= 35) {
      frequency = 'monthly';
    } else if (daysDiff >= 80 && daysDiff <= 100) {
      frequency = 'quarterly';
    } else if (daysDiff >= 360 && daysDiff <= 370) {
      frequency = 'yearly';
    } else if (daysDiff >= 6) {
      frequency = 'custom';
    } else {
      return null;
    }
    
    return {
      frequency,
      medianInterval: daysDiff,
      mad: 0, // Can't calculate MAD with only 1 interval
      dayOfMonth: new Date(transactions[0].date).getDate(),
      dayOfWeek: new Date(transactions[0].date).getDay(),
    };
  }

  // For 3+ transactions, use full cadence inference
  // Calculate intervals
  const intervals: number[] = [];
  for (let i = 1; i < transactions.length; i++) {
    const prevDate = new Date(transactions[i - 1].date);
    const currDate = new Date(transactions[i].date);
    const daysDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    intervals.push(daysDiff);
  }

  // Reject if all intervals < 6 days (not recurring)
  if (intervals.every(interval => interval < 6)) {
    return null;
  }

  const medianInterval = calculateMedian(intervals);
  
  // Calculate MAD (Median Absolute Deviation)
  const deviations = intervals.map(interval => Math.abs(interval - medianInterval));
  const mad = calculateMedian(deviations);
  
  // Reject if MAD/median > 0.2 (too inconsistent)
  if (mad / medianInterval > 0.2) {
    return null;
  }

  // Map to frequency
  let frequency: RecurringPattern['frequency'];
  let dayOfMonth: number | null = null;
  let dayOfWeek: number | null = null;

  if (medianInterval >= 6 && medianInterval <= 8) {
    frequency = 'weekly';
    const daysOfWeek = transactions.map(t => new Date(t.date).getDay());
    dayOfWeek = getMostCommon(daysOfWeek);
  } else if (medianInterval >= 12 && medianInterval <= 16) {
    frequency = 'biweekly';
    const daysOfWeek = transactions.map(t => new Date(t.date).getDay());
    dayOfWeek = getMostCommon(daysOfWeek);
  } else if (medianInterval >= 25 && medianInterval <= 35) {
    frequency = 'monthly';
    const daysOfMonth = transactions.map(t => new Date(t.date).getDate());
    dayOfMonth = getMostCommon(daysOfMonth);
  } else if (medianInterval >= 80 && medianInterval <= 100) {
    frequency = 'quarterly';
  } else if (medianInterval >= 360 && medianInterval <= 370) {
    frequency = 'yearly';
  } else {
    // Custom frequency - require stricter consistency
    if (transactions.length < 4) return null;
    frequency = 'custom';
  }

  return {
    frequency,
    medianInterval,
    mad,
    dayOfMonth,
    dayOfWeek,
  };
}

/**
 * Step 5: Validate pattern (date anchors, recency, amount consistency)
 */
export function validatePattern(
  transactions: any[],
  cadence: CadenceInfo
): { valid: boolean; dateConsistency: number } {
  // Date anchor checks
  let dateConsistency = 1.0;

  if (cadence.frequency === 'monthly' && cadence.dayOfMonth !== null) {
    // Monthly: require day-of-month within ±2 days of median
    const daysOfMonth = transactions.map(t => new Date(t.date).getDate());
    const medianDay = cadence.dayOfMonth;
    
    // Check if days are within ±2 of median
    const validDays = daysOfMonth.filter(day => {
      const diff = Math.abs(day - medianDay);
      return diff <= 2 || (day >= 28 && medianDay <= 3) || (day <= 3 && medianDay >= 28);
    });

    if (validDays.length < daysOfMonth.length * 0.8) {
      return { valid: false, dateConsistency: 0 };
    }

    // Calculate consistency score
    const dayVariance = calculateVariance(daysOfMonth);
    dateConsistency = Math.max(0.5, 1 - (dayVariance / 100));
  } else if ((cadence.frequency === 'weekly' || cadence.frequency === 'biweekly') && cadence.dayOfWeek !== null) {
    // Weekly/biweekly: require consistent weekday (±1 day for bank posting shifts)
    const daysOfWeek = transactions.map(t => new Date(t.date).getDay());
    const medianDayOfWeek = cadence.dayOfWeek;
    
    // Allow ±1 day shift (business day rule: Fri/Mon)
    const validDays = daysOfWeek.filter(day => {
      const diff = Math.abs(day - medianDayOfWeek);
      return diff <= 1 || diff === 6; // Also allow Sat/Sun wrap
    });

    if (validDays.length < daysOfWeek.length * 0.8) {
      return { valid: false, dateConsistency: 0 };
    }

    const dayVariance = calculateVariance(daysOfWeek);
    dateConsistency = Math.max(0.5, 1 - (dayVariance / 10));
  }

  return { valid: true, dateConsistency };
}

/**
 * Check if a merchant name suggests it's a retail/dining establishment
 */
export function isLikelyRetailMerchant(merchantName: string): boolean {
  const name = merchantName.toLowerCase();
  
  // Known retail/dining chains
  const retailChains = [
    'walmart', 'target', 'costco', 'kroger', 'safeway', 'whole foods',
    'mcdonald', 'mcdonalds', 'burger king', 'wendy', 'taco bell', 'subway',
    'starbucks', 'dunkin', 'dollar tree', 'dollar general', 'family dollar',
    'cvs', 'walgreens', 'rite aid', '7-eleven', 'circle k',
    'amazon', 'ebay', 'etsy', 'paypal', // Online retail
    'gas station', 'shell', 'exxon', 'bp', 'chevron', 'mobil',
    'convenience store', 'pharmacy', 'drug store',
  ];
  
  // Check against known chains
  if (retailChains.some(chain => name.includes(chain))) {
    return true;
  }
  
  // Check for retail keywords
  const retailKeywords = [
    'store', 'market', 'supermarket', 'grocery', 'mart',
    'restaurant', 'cafe', 'café', 'diner', 'fast food', 'pizza',
    'dollar', 'convenience', 'gas', 'fuel', 'pharmacy', 'drug',
    'retail', 'shop', 'shopping', 'mall',
  ];
  
  return retailKeywords.some(keyword => name.includes(keyword));
}

/**
 * Calculate a score indicating how likely a pattern is from a retail/dining merchant
 * Returns a score from 0 (definitely not retail) to 1 (definitely retail)
 */
export function calculateRetailScore(
  merchantName: string,
  pattern: {
    expectedAmount: number;
    amountVariance: number;
    occurrenceCount: number;
    frequency: RecurringPattern['frequency'];
    cadence?: { mad: number; medianInterval: number };
  }
): number {
  let score = 0;
  
  // Merchant name check (strongest signal)
  if (isLikelyRetailMerchant(merchantName)) {
    score += 0.4;
  }
  
  // Small amounts are more likely retail
  if (pattern.expectedAmount < 20) {
    score += 0.3;
  } else if (pattern.expectedAmount < 50) {
    score += 0.15;
  }
  
  // High variance suggests variable purchases (retail)
  const coefficientOfVariation = Math.sqrt(pattern.amountVariance) / pattern.expectedAmount;
  if (coefficientOfVariation > 0.5) {
    score += 0.2;
  } else if (coefficientOfVariation > 0.3) {
    score += 0.1;
  }
  
  // Low occurrence count (especially 2) is suspicious for retail
  if (pattern.occurrenceCount === 2) {
    score += 0.2;
  } else if (pattern.occurrenceCount <= 3) {
    score += 0.1;
  }
  
  // Inconsistent frequency suggests irregular retail purchases
  if (pattern.cadence) {
    const consistency = pattern.cadence.mad / pattern.cadence.medianInterval;
    if (consistency > 0.3) {
      score += 0.15;
    } else if (consistency > 0.2) {
      score += 0.05;
    }
  }
  
  // Custom frequency is suspicious (not a standard subscription cadence)
  if (pattern.frequency === 'custom') {
    score += 0.1;
  }
  
  return Math.min(score, 1.0);
}

/**
 * Step 6: Score pattern (conservative thresholds)
 */
export function scorePattern(
  transactions: any[],
  cadence: CadenceInfo,
  validation: { valid: boolean; dateConsistency: number }
): number {
  const intervals: number[] = [];
  for (let i = 1; i < transactions.length; i++) {
    const prevDate = new Date(transactions[i - 1].date);
    const currDate = new Date(transactions[i].date);
    const daysDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    intervals.push(daysDiff);
  }

  const amounts = transactions.map(t => Math.abs(t.total_amount));
  const medianAmount = calculateMedian(amounts);
  const amountVariance = calculateAmountVariance(amounts, medianAmount);

  // Regularity score based on MAD
  const regularityScore = Math.max(0, 1 - (cadence.mad / cadence.medianInterval));
  
  // Amount consistency
  const amountConsistency = Math.max(0, 1 - (amountVariance / (medianAmount * medianAmount)));
  
  // Occurrence score (capped)
  const occurrenceScore = Math.min(transactions.length / 10, 0.3);
  
  // Time span score
  const timeSpanMonths = (new Date(transactions[transactions.length - 1].date).getTime() - 
                          new Date(transactions[0].date).getTime()) / (1000 * 60 * 60 * 24 * 30);
  const timeSpanScore = Math.min(timeSpanMonths / 12, 0.2);

  // Date consistency (from validation)
  const dateConsistencyScore = validation.dateConsistency * 0.2;

  // Weekly patterns need stricter requirements
  let weeklyPenalty = 0;
  if (cadence.frequency === 'weekly') {
    if (transactions.length < 6) return 0;
    if (timeSpanMonths < 2) return 0;
    if (amountVariance > medianAmount * medianAmount * 0.1) {
      weeklyPenalty = -0.2;
    }
  }

  const score = Math.min(
    occurrenceScore +
    (regularityScore * 0.3) +
    (amountConsistency * 0.2) +
    timeSpanScore +
    dateConsistencyScore +
    weeklyPenalty,
    1.0
  );

  return score;
}

/**
 * Analyze pattern for variable amount transactions (e.g., utilities)
 * Very conservative: requires high date consistency and significant amount variance
 */
export function analyzeVariableAmountPattern(
  merchantGroupId: number,
  merchantName: string,
  transactions: any[],
  transactionType: 'income' | 'expense'
): RecurringPattern | null {
  // Allow 4+ transactions for utilities (was 5)
  if (transactions.length < 4) return null;

  // Sort by date
  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate intervals
  const intervals: number[] = [];
  for (let i = 1; i < transactions.length; i++) {
    const prevDate = new Date(transactions[i - 1].date);
    const currDate = new Date(transactions[i].date);
    const daysDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    intervals.push(daysDiff);
  }

  const medianInterval = calculateMedian(intervals);

  // Only detect monthly variable patterns (utilities)
  // Allow slightly wider range for utilities that might vary
  if (medianInterval < 20 || medianInterval > 40) return null;

  // Check date consistency - utilities come on similar dates each month
  const daysOfMonth = transactions.map(t => new Date(t.date).getDate());
  const medianDay = calculateMedian(daysOfMonth);
  
  // More lenient: days must be within ±3 of median (allows for weekends/holidays)
  const validDays = daysOfMonth.filter(day => {
    const diff = Math.abs(day - medianDay);
    return diff <= 3 || (day >= 28 && medianDay <= 3) || (day <= 3 && medianDay >= 28);
  });

  // Require at least 80% of days to be valid (was 90%)
  if (validDays.length < daysOfMonth.length * 0.8) {
    return null; // Too inconsistent
  }

  const amounts = transactions.map(t => Math.abs(t.total_amount));
  const medianAmount = calculateMedian(amounts);
  const amountVariance = calculateAmountVariance(amounts, medianAmount);
  const coefficientOfVariation = Math.sqrt(amountVariance) / medianAmount;

  // Require significant amount variance (> 10% for utilities, was 15%)
  // Utilities can have smaller variance if usage is relatively stable
  if (coefficientOfVariation <= 0.10) {
    return null;
  }

  // Calculate confidence - lower for variable amounts but higher for date consistency
  const mad = calculateMedian(intervals.map(interval => Math.abs(interval - medianInterval)));
  const regularityScore = Math.max(0, 1 - (mad / medianInterval));
  const dateConsistencyScore = 0.9; // High date consistency required
  const occurrenceScore = Math.min(transactions.length / 12, 0.3);
  const timeSpanMonths = (new Date(transactions[transactions.length - 1].date).getTime() - 
                          new Date(transactions[0].date).getTime()) / (1000 * 60 * 60 * 24 * 30);
  const timeSpanScore = Math.min(timeSpanMonths / 12, 0.2);

  const confidenceScore = Math.min(
    occurrenceScore + 
    (regularityScore * 0.3) + 
    (dateConsistencyScore * 0.3) +
    timeSpanScore - 
    (amountVariance / (medianAmount * medianAmount)) * 0.1,
    1.0
  );

  if (confidenceScore < 0.5) return null;

  const categories = transactions.flatMap((t) => getNonSystemCategoryIds(t));
  const categoryId = categories.length > 0 ? getMostCommon(categories) : null;
  // Use account from the most recent transaction (last in array since they're sorted by date)
  const mostRecentTransaction = transactions[transactions.length - 1];
  const accountId = mostRecentTransaction.account_id || null;
  const creditCardId = mostRecentTransaction.credit_card_id || null;

  const lastDate = new Date(transactions[transactions.length - 1].date);
  const nextExpectedDate = calculateNextDate(lastDate, 'monthly', medianInterval, medianDay, null);

  return {
    merchantGroupId,
    merchantName,
    frequency: 'monthly',
    expectedAmount: medianAmount,
    amountVariance: Math.sqrt(amountVariance),
    transactionType,
    categoryId,
    accountId,
    creditCardId,
    confidenceScore,
    occurrenceCount: transactions.length,
    lastOccurrenceDate: transactions[transactions.length - 1].date,
    nextExpectedDate: nextExpectedDate.toISOString().split('T')[0],
    transactionIds: transactions.map(t => t.id),
  };
}

/**
 * Calculate median of an array
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Calculate amount variance (using median as base)
 */
export function calculateAmountVariance(amounts: number[], median: number): number {
  if (amounts.length === 0) return 0;
  const squaredDiffs = amounts.map(amount => Math.pow(amount - median, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / amounts.length;
}

/**
 * Calculate variance of an array
 */
export function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Get most common value in array
 */
export function getMostCommon<T>(arr: T[]): T {
  const counts = new Map<T, number>();
  for (const val of arr) {
    counts.set(val, (counts.get(val) || 0) + 1);
  }
  let maxCount = 0;
  let mostCommon = arr[0];
  for (const [val, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = val;
    }
  }
  return mostCommon;
}

/**
 * Calculate next expected date based on frequency
 */
export function calculateNextDate(
  lastDate: Date,
  frequency: RecurringPattern['frequency'],
  medianInterval: number,
  dayOfMonth: number | null,
  dayOfWeek: number | null
): Date {
  const next = new Date(lastDate);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      if (dayOfMonth !== null) {
        const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(dayOfMonth, lastDayOfMonth));
      }
      break;
    case 'bimonthly':
      next.setMonth(next.getMonth() + 2);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    case 'custom':
      next.setDate(next.getDate() + Math.round(medianInterval));
      break;
  }

  return next;
}
