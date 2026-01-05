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

/**
 * Detect recurring transaction patterns from historical transactions
 */
export async function detectRecurringTransactions(
  userId: string,
  budgetAccountId: number,
  lookbackMonths: number = 24
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
        amount
      )
    `)
    .eq('user_id', userId)
    .eq('budget_account_id', budgetAccountId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) throw error;
  if (!transactions || transactions.length === 0) return [];

  // Group transactions by merchant_group_id
  const merchantGroups = new Map<number, any[]>();

  for (const txn of transactions) {
    if (!txn.merchant_group_id) continue;

    if (!merchantGroups.has(txn.merchant_group_id)) {
      merchantGroups.set(txn.merchant_group_id, []);
    }
    merchantGroups.get(txn.merchant_group_id)!.push(txn);
  }

  const patterns: RecurringPattern[] = [];

  // Analyze each merchant group
  for (const [merchantGroupId, txns] of merchantGroups.entries()) {
    if (txns.length < 3) continue; // Need at least 3 occurrences

    const merchantName = txns[0].merchant_groups?.display_name || 'Unknown';

    // Group by transaction type first, then by similar amount
    const incomeTxns = txns.filter(t => t.transaction_type === 'income');
    const expenseTxns = txns.filter(t => t.transaction_type === 'expense');

    // Process income transactions
    if (incomeTxns.length >= 3) {
      const amountGroups = groupBySimilarAmount(incomeTxns);
      for (const amountGroup of amountGroups) {
        if (amountGroup.length < 3) continue;
        const pattern = analyzePattern(
          merchantGroupId,
          merchantName,
          amountGroup,
          'income'
        );
        if (pattern && pattern.confidenceScore >= 0.5) {
          patterns.push(pattern);
        }
      }
    }

    // Process expense transactions
    if (expenseTxns.length >= 3) {
      const amountGroups = groupBySimilarAmount(expenseTxns);
      for (const amountGroup of amountGroups) {
        if (amountGroup.length < 3) continue;
        const pattern = analyzePattern(
          merchantGroupId,
          merchantName,
          amountGroup,
          'expense'
        );
        if (pattern && pattern.confidenceScore >= 0.5) {
          patterns.push(pattern);
        }
      }

      // Also check for variable amount patterns (e.g., utilities)
      // If we have enough transactions but they don't group well by amount,
      // check if they have consistent monthly dates (utilities pattern)
      // Only check if we have 6+ transactions and they're spread across multiple months
      if (expenseTxns.length >= 6) {
        const timeSpanMonths = (new Date(expenseTxns[expenseTxns.length - 1].date).getTime() - 
                                new Date(expenseTxns[0].date).getTime()) / (1000 * 60 * 60 * 24 * 30);
        
        // Check if amounts vary significantly (utilities) vs similar amounts (subscriptions)
        const amounts = expenseTxns.map(t => Math.abs(t.total_amount));
        const avgAmount = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
        const amountVariance = calculateVariance(amounts);
        const coefficientOfVariation = Math.sqrt(amountVariance) / avgAmount;
        
        // If amounts vary by more than 15% and we have 3+ months of data, try variable pattern detection
        if (coefficientOfVariation > 0.15 && timeSpanMonths >= 3) {
          const variablePattern = analyzeVariableAmountPattern(
            merchantGroupId,
            merchantName,
            expenseTxns,
            'expense'
          );
          if (variablePattern && variablePattern.confidenceScore >= 0.5) {
            patterns.push(variablePattern);
          }
        }
      }
    }
  }

  return patterns;
}

/**
 * Group transactions by similar amount
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
      const percentDiff = amountDiff / txn.total_amount;
      const dollarThreshold = Math.max(5, txn.total_amount * 0.05);

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
 * Analyze date pattern to determine frequency
 */
function analyzePattern(
  merchantGroupId: number,
  merchantName: string,
  transactions: any[],
  transactionType: 'income' | 'expense'
): RecurringPattern | null {
  if (transactions.length < 3) return null;

  // Sort by date
  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate intervals between transactions
  const intervals: number[] = [];
  for (let i = 1; i < transactions.length; i++) {
    const prevDate = new Date(transactions[i - 1].date);
    const currDate = new Date(transactions[i].date);
    const daysDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    intervals.push(daysDiff);
  }

  // Calculate average interval
  const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  
  // Reject patterns where all intervals are less than 6 days - these are just random purchases
  // The shortest legitimate recurring pattern is weekly (6-8 days)
  // If all intervals are < 6 days, it's not a recurring pattern
  if (intervals.every(interval => interval < 6)) {
    return null;
  }
  
  // Also reject if average is less than 6 days
  if (avgInterval < 6) {
    return null;
  }
  
  // Calculate interval variance to check consistency
  const intervalVariance = calculateVariance(intervals);
  const intervalStdDev = Math.sqrt(intervalVariance);
  
  // Determine frequency with strict consistency checks
  let frequency: RecurringPattern['frequency'] = 'monthly';
  let dayOfMonth: number | null = null;
  let dayOfWeek: number | null = null;

  if (avgInterval >= 25 && avgInterval <= 31) {
    // For monthly: check day-of-month consistency (handles month-end/beginning variations)
    const daysOfMonth = transactions.map(t => new Date(t.date).getDate());
    
    // Normalize days: treat 30th/31st as equivalent to 1st/2nd for consistency check
    // This handles cases where transactions happen on month boundaries (30th vs 1st)
    const normalizedDays = daysOfMonth.map(day => {
      // If day is 30 or 31, treat as 0 or -1 for variance calculation
      // This groups month-end and month-start together
      if (day >= 30) return 0;
      return day;
    });
    const dayVariance = calculateVariance(normalizedDays);
    
    // Also check if days cluster around month start (1-3) or month end (28-31)
    const earlyMonthDays = daysOfMonth.filter(d => d >= 1 && d <= 3).length;
    const lateMonthDays = daysOfMonth.filter(d => d >= 28 && d <= 31).length;
    const isConsistentDayOfMonth = dayVariance < 100 || 
                                   (earlyMonthDays + lateMonthDays) >= daysOfMonth.length * 0.8;
    
    // Count valid intervals (25-35 days) - allow some gaps for missing months
    const validIntervals = intervals.filter(interval => interval >= 25 && interval <= 35);
    const invalidIntervals = intervals.filter(interval => interval < 25 || interval > 35);
    
    // Allow monthly pattern if:
    // 1. At least 60% of intervals are valid (handles missing months)
    // 2. Invalid intervals are likely gaps (60-95 days = 2-3 months) or very short (< 10 days = same month)
    // 3. Dates are consistent (day of month) OR we have enough transactions to establish pattern
    const validIntervalRatio = validIntervals.length / intervals.length;
    const invalidAreGaps = invalidIntervals.every(interval => 
      (interval >= 60 && interval <= 95) || // 2-3 month gaps
      interval < 10 // Same month (30th to 1st)
    );
    
    // For monthly patterns, be more lenient - if we have 4+ transactions and most intervals are valid,
    // accept it even with some date variance (handles month-end/beginning variations)
    if (validIntervalRatio >= 0.6 && (invalidIntervals.length === 0 || invalidAreGaps)) {
      if (isConsistentDayOfMonth || transactions.length >= 4) {
        frequency = 'monthly';
        // Use the most common day, but prefer early month (1-3) if there's a tie
        const dayCounts = new Map<number, number>();
        daysOfMonth.forEach(day => {
          dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
        });
        let maxCount = 0;
        let mostCommon = daysOfMonth[0];
        for (const [day, count] of dayCounts.entries()) {
          if (count > maxCount || (count === maxCount && day <= 3)) {
            maxCount = count;
            mostCommon = day;
          }
        }
        dayOfMonth = mostCommon;
      } else {
        return null;
      }
    } else {
      // Intervals are too inconsistent for monthly pattern
      return null;
    }
  } else if (avgInterval >= 12 && avgInterval <= 16) {
    // For biweekly: all intervals should be 12-16 days
    const allIntervalsValid = intervals.every(interval => interval >= 12 && interval <= 16);
    if (!allIntervalsValid || intervalStdDev > 2) {
      return null;
    }
    frequency = 'biweekly';
  } else if (avgInterval >= 6 && avgInterval <= 8) {
    // For weekly: all intervals should be 6-8 days
    const allIntervalsValid = intervals.every(interval => interval >= 6 && interval <= 8);
    if (!allIntervalsValid || intervalStdDev > 1.5) {
      return null;
    }
    frequency = 'weekly';
    // Get most common day of week
    const daysOfWeek = transactions.map(t => new Date(t.date).getDay());
    dayOfWeek = getMostCommon(daysOfWeek);
  } else if (avgInterval >= 85 && avgInterval <= 95) {
    // For quarterly: all intervals should be 85-95 days
    const allIntervalsValid = intervals.every(interval => interval >= 85 && interval <= 95);
    if (!allIntervalsValid || intervalStdDev > 5) {
      return null;
    }
    frequency = 'quarterly';
  } else if (avgInterval >= 360 && avgInterval <= 370) {
    // For yearly: all intervals should be 360-370 days
    const allIntervalsValid = intervals.every(interval => interval >= 360 && interval <= 370);
    if (!allIntervalsValid || intervalStdDev > 10) {
      return null;
    }
    frequency = 'yearly';
  } else {
    // Custom frequency - require stricter consistency and more occurrences
    // Custom patterns need at least 4 transactions to establish a pattern
    if (transactions.length < 4) {
      return null;
    }
    
    // Check for skipped periods (gaps) - if there's a large gap relative to average, it's not recurring
    const maxInterval = Math.max(...intervals);
    const minInterval = Math.min(...intervals);
    // If max interval is more than 2x the min interval, there's likely a gap
    if (maxInterval > minInterval * 2) {
      return null;
    }
    
    // Require tighter consistency for custom patterns
    const coefficientOfVariation = intervalStdDev / avgInterval;
    if (coefficientOfVariation > 0.2) {
      // More than 20% variation means it's not consistent enough for custom patterns
      return null;
    }
    
    // For custom patterns, require longer time span to establish pattern
    const timeSpanMonths = (new Date(transactions[transactions.length - 1].date).getTime() - 
                            new Date(transactions[0].date).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (timeSpanMonths < 3) {
      // Need at least 3 months of data for custom patterns
      return null;
    }
    
    frequency = 'custom';
  }

  // Calculate amount statistics
  // Ensure all amounts are positive (they should be stored as positive in transactions table)
  // Use Math.abs defensively to handle any edge cases
  const amounts = transactions.map(t => Math.abs(t.total_amount));
  const avgAmount = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
  const amountVariance = calculateVariance(amounts);

  // Calculate confidence score
  const regularityScore = 1 - (calculateVariance(intervals) / (avgInterval * avgInterval));
  const amountConsistency = 1 - (amountVariance / (avgAmount * avgAmount));
  const occurrenceScore = Math.min(transactions.length / 10, 0.3);
  const timeSpanMonths = (new Date(transactions[transactions.length - 1].date).getTime() - 
                          new Date(transactions[0].date).getTime()) / (1000 * 60 * 60 * 24 * 30);
  const timeSpanScore = Math.min(timeSpanMonths / 12, 0.2);

  // Date consistency check - for monthly patterns, check if dates are consistent (utilities)
  // vs random (fast food). Calculate variance of day of month.
  let dateConsistencyScore = 1.0;
  if (frequency === 'monthly' && transactions.length >= 3) {
    const daysOfMonth = transactions.map(t => new Date(t.date).getDate());
    const dayVariance = calculateVariance(daysOfMonth);
    // Lower variance = more consistent dates (utilities). Higher variance = random dates (fast food)
    // Normalize: variance of 0-5 days = good (1.0), variance > 10 days = bad (0.5)
    dateConsistencyScore = Math.max(0.5, 1 - (dayVariance / 100)); // Scale appropriately
  }

  // Stricter requirements for weekly patterns to avoid fast food false positives
  // Weekly patterns need more occurrences and longer time span
  let weeklyPenalty = 0;
  if (frequency === 'weekly') {
    if (transactions.length < 6) {
      // Need at least 6 occurrences for weekly patterns
      return null;
    }
    if (timeSpanMonths < 2) {
      // Need at least 2 months of data for weekly patterns
      return null;
    }
    // Penalize weekly patterns with high amount variance (random fast food purchases)
    if (amountVariance > avgAmount * avgAmount * 0.1) {
      weeklyPenalty = -0.2; // Reduce confidence for variable amounts
    }
  }

  const confidenceScore = Math.min(
    occurrenceScore + 
    (regularityScore * 0.3) + 
    (amountConsistency * 0.2) + 
    timeSpanScore + 
    (dateConsistencyScore * 0.1) + // Add date consistency for monthly patterns
    weeklyPenalty,
    1.0
  );

  // Get most common category, account, credit card
  const categories = transactions.flatMap(t => 
    t.transaction_splits?.map((s: any) => s.category_id) || []
  );
  const categoryId = categories.length > 0 ? getMostCommon(categories) : null;
  const accountId = transactions[0].account_id || null;
  const creditCardId = transactions[0].credit_card_id || null;

  // Calculate next expected date
  const lastDate = new Date(transactions[transactions.length - 1].date);
  const nextExpectedDate = calculateNextDate(lastDate, frequency, avgInterval, dayOfMonth, dayOfWeek);

  return {
    merchantGroupId,
    merchantName,
    frequency,
    expectedAmount: avgAmount,
    amountVariance: Math.sqrt(amountVariance),
    transactionType,
    categoryId,
    accountId,
    creditCardId,
    confidenceScore,
    occurrenceCount: transactions.length,
    lastOccurrenceDate: transactions[transactions.length - 1].date,
    nextExpectedDate: nextExpectedDate.toISOString().split('T')[0],
    transactionIds: transactions.map(t => t.id), // Track which transactions make up this pattern
  };
}

/**
 * Analyze pattern for variable amount transactions (e.g., utilities)
 * These have consistent dates but varying amounts
 */
function analyzeVariableAmountPattern(
  merchantGroupId: number,
  merchantName: string,
  transactions: any[],
  transactionType: 'income' | 'expense'
): RecurringPattern | null {
  if (transactions.length < 6) return null; // Need more occurrences for variable patterns

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

  const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;

  // Only detect monthly variable patterns (utilities)
  if (avgInterval < 25 || avgInterval > 31) return null;

  // Check date consistency - utilities come on similar dates each month
  const daysOfMonth = transactions.map(t => new Date(t.date).getDate());
  const dayVariance = calculateVariance(daysOfMonth);
  
  // If dates are too inconsistent, it's probably not a utility bill
  if (dayVariance > 50) return null; // More than ~7 days variance

  const amounts = transactions.map(t => Math.abs(t.total_amount));
  const avgAmount = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
  const amountVariance = calculateVariance(amounts);

  // Calculate confidence - lower for variable amounts but higher for date consistency
  const regularityScore = 1 - (calculateVariance(intervals) / (avgInterval * avgInterval));
  const dateConsistencyScore = Math.max(0.5, 1 - (dayVariance / 100));
  const occurrenceScore = Math.min(transactions.length / 12, 0.3);
  const timeSpanMonths = (new Date(transactions[transactions.length - 1].date).getTime() - 
                          new Date(transactions[0].date).getTime()) / (1000 * 60 * 60 * 24 * 30);
  const timeSpanScore = Math.min(timeSpanMonths / 12, 0.2);

  // Variable amount patterns get lower confidence but can still be detected
  const confidenceScore = Math.min(
    occurrenceScore + 
    (regularityScore * 0.3) + 
    (dateConsistencyScore * 0.3) + // Higher weight on date consistency
    timeSpanScore - 
    (amountVariance / (avgAmount * avgAmount)) * 0.1, // Small penalty for variance
    1.0
  );

  if (confidenceScore < 0.5) return null;

  const dayOfMonth = getMostCommon(daysOfMonth);
  const categories = transactions.flatMap(t => 
    t.transaction_splits?.map((s: any) => s.category_id) || []
  );
  const categoryId = categories.length > 0 ? getMostCommon(categories) : null;
  const accountId = transactions[0].account_id || null;
  const creditCardId = transactions[0].credit_card_id || null;

  const lastDate = new Date(transactions[transactions.length - 1].date);
  const nextExpectedDate = calculateNextDate(lastDate, 'monthly', avgInterval, dayOfMonth, null);

  return {
    merchantGroupId,
    merchantName,
    frequency: 'monthly',
    expectedAmount: avgAmount,
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
  avgInterval: number,
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
        // Try to set to same day of month, but handle month-end edge cases
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
      next.setDate(next.getDate() + Math.round(avgInterval));
      break;
  }

  return next;
}




