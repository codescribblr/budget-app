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

interface TransactionSegment {
  transactions: any[];
  startDate: Date;
  endDate: Date;
}

interface CadenceInfo {
  frequency: RecurringPattern['frequency'];
  medianInterval: number;
  mad: number; // Median Absolute Deviation
  dayOfMonth: number | null;
  dayOfWeek: number | null;
}

function isSystemCategorySplit(split: any): boolean {
  const category = split?.categories;
  return Boolean(category?.is_system || category?.is_buffer);
}

function hasNonSystemSplit(transaction: any): boolean {
  const splits = transaction.transaction_splits;
  if (!Array.isArray(splits) || splits.length === 0) {
    return true;
  }
  return splits.some((split: any) => !isSystemCategorySplit(split));
}

function getNonSystemCategoryIds(transaction: any): number[] {
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

  // Get all transactions for this account
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
    .order('date', { ascending: true });

  if (error) throw error;
  if (!transactions || transactions.length === 0) return [];

  // Filter out transactions with only system category splits
  const validTransactions = transactions.filter(txn => 
    txn.merchant_group_id && hasNonSystemSplit(txn)
  );

  if (validTransactions.length < 3) return [];

  // Step 1: Group candidates by merchant_group_id, transaction_type, and account
  const candidateGroups = groupCandidates(validTransactions);

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
    if (recentSegment.transactions.length < 3) continue;

    // Step 3: Group by similar amounts (conservative: max($5, 5%))
    const amountGroups = groupBySimilarAmount(recentSegment.transactions);
    
    // Check for variable-amount patterns when no amount groups are found
    if (amountGroups.length === 0 && recentSegment.transactions.length >= 5) {
      const variablePattern = analyzeVariableAmountPattern(
        group.merchantGroupId,
        merchantName,
        recentSegment.transactions,
        group.transactionType
      );
      if (variablePattern && variablePattern.confidenceScore >= 0.5) {
        patterns.push(variablePattern);
      }
    }
    
    for (const amountGroup of amountGroups) {
      if (amountGroup.length < 3) continue;

      // Step 4: Infer cadence using median + MAD
      const cadence = inferCadence(amountGroup);
      if (!cadence) continue;

      // Step 5: Validate pattern (date anchors, recency, amount consistency)
      const validation = validatePattern(amountGroup, cadence);
      if (!validation.valid) continue;

      // Step 6: Score pattern (conservative thresholds)
      const score = scorePattern(amountGroup, cadence, validation);
      if (score < 0.5) continue; // Conservative threshold

      // Step 7: Check recency gating (last occurrence within 1.5x interval)
      const lastDate = new Date(amountGroup[amountGroup.length - 1].date);
      const daysSinceLast = (endDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      const recencyThreshold = cadence.medianInterval * 1.5;
      
      if (daysSinceLast > recencyThreshold) {
        continue; // Too old, not actively recurring
      }

      // Build pattern
      const amounts = amountGroup.map(t => Math.abs(t.total_amount));
      const medianAmount = calculateMedian(amounts);
      const amountVariance = calculateAmountVariance(amounts, medianAmount);

      const categories = amountGroup.flatMap((t) => getNonSystemCategoryIds(t));
      const categoryId = categories.length > 0 ? getMostCommon(categories) : null;
      const accountId = amountGroup[0].account_id || null;
      const creditCardId = amountGroup[0].credit_card_id || null;

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

    // Also check for variable amount patterns (utilities) as fallback
    // Only if we found amount groups (already checked when no groups found)
    if (amountGroups.length > 0 && recentSegment.transactions.length >= 5) {
      const variablePattern = analyzeVariableAmountPattern(
        group.merchantGroupId,
        merchantName,
        recentSegment.transactions,
        group.transactionType
      );
      if (variablePattern && variablePattern.confidenceScore >= 0.5) {
        patterns.push(variablePattern);
      }
    }
  }

  return patterns;
}

/**
 * Step 1: Group candidates by merchant_group_id, transaction_type, and account
 */
function groupCandidates(transactions: any[]): Array<{
  merchantGroupId: number;
  transactionType: 'income' | 'expense';
  accountKey: string; // account_id or credit_card_id
  transactions: any[];
}> {
  const groups = new Map<string, any[]>();

  for (const txn of transactions) {
    const accountKey = txn.account_id 
      ? `account-${txn.account_id}` 
      : txn.credit_card_id 
        ? `card-${txn.credit_card_id}` 
        : 'none';
    
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
function segmentByGap(transactions: any[]): TransactionSegment[] {
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
  // For monthly/quarterly: max(2 * median, 45 days)
  // For weekly/biweekly: max(2 * median, 21 days)
  let gapThreshold: number;
  if (medianInterval >= 25) {
    gapThreshold = Math.max(2 * medianInterval, 45);
  } else {
    gapThreshold = Math.max(2 * medianInterval, 21);
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

  // Add final segment
  if (currentSegment.length >= 3) {
    segments.push({
      transactions: currentSegment,
      startDate: new Date(currentSegment[0].date),
      endDate: new Date(currentSegment[currentSegment.length - 1].date),
    });
  }

  return segments;
}

/**
 * Step 3: Group transactions by similar amount
 * Conservative: max($5, 5%) variance
 */
function groupBySimilarAmount(transactions: any[]): any[][] {
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
      const dollarThreshold = Math.max(5, Math.abs(txn.total_amount) * 0.05);

      if (amountDiff <= dollarThreshold || percentDiff <= 0.05) {
        group.push(otherTxn);
        processed.add(otherTxn.id);
      }
    }

    if (group.length >= 3) {
      groups.push(group);
    }
  }

  return groups;
}

/**
 * Step 4: Infer cadence using median interval + MAD (Median Absolute Deviation)
 */
function inferCadence(transactions: any[]): CadenceInfo | null {
  if (transactions.length < 3) return null;

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
function validatePattern(
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
 * Step 6: Score pattern (conservative thresholds)
 */
function scorePattern(
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
function analyzeVariableAmountPattern(
  merchantGroupId: number,
  merchantName: string,
  transactions: any[],
  transactionType: 'income' | 'expense'
): RecurringPattern | null {
  if (transactions.length < 5) return null;

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
  if (medianInterval < 25 || medianInterval > 35) return null;

  // Check date consistency - utilities come on similar dates each month
  const daysOfMonth = transactions.map(t => new Date(t.date).getDate());
  const medianDay = calculateMedian(daysOfMonth);
  
  // Very strict: days must be within ±2 of median
  const validDays = daysOfMonth.filter(day => {
    const diff = Math.abs(day - medianDay);
    return diff <= 2 || (day >= 28 && medianDay <= 3) || (day <= 3 && medianDay >= 28);
  });

  if (validDays.length < daysOfMonth.length * 0.9) {
    return null; // Too inconsistent
  }

  const amounts = transactions.map(t => Math.abs(t.total_amount));
  const medianAmount = calculateMedian(amounts);
  const amountVariance = calculateAmountVariance(amounts, medianAmount);
  const coefficientOfVariation = Math.sqrt(amountVariance) / medianAmount;

  // Require significant amount variance (> 15%)
  if (coefficientOfVariation <= 0.15) {
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
  const accountId = transactions[0].account_id || null;
  const creditCardId = transactions[0].credit_card_id || null;

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
function calculateMedian(values: number[]): number {
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
function calculateAmountVariance(amounts: number[], median: number): number {
  if (amounts.length === 0) return 0;
  const squaredDiffs = amounts.map(amount => Math.pow(amount - median, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / amounts.length;
}

/**
 * Calculate variance of an array
 */
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Get most common value in array
 */
function getMostCommon<T>(arr: T[]): T {
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
function calculateNextDate(
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
