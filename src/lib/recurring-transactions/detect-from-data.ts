import {
  classifyCandidate,
  passesConfidenceThreshold,
  type UserFeedbackRecord,
} from './classification/classify-candidate';
import { groupBySimilarAmount, isVariableAmountCluster } from './pipeline/amount-grouping';
import { inferCadence, validateMonthlyDateAnchor } from './pipeline/cadence';
import { filterValidTransactions } from './pipeline/filters';
import { groupCandidates } from './pipeline/group-candidates';
import { passesRecencyGate, segmentByGap } from './pipeline/segment-by-gap';
import type {
  CandidatePattern,
  DetectionTransaction,
  RecurringPattern,
} from './types';
import { calculateNextDate, formatDateISO, monthsBetween } from './utils/dates';
import { calculateCV, calculateVariance, getMostCommon } from './utils/stats';

export interface DetectFromDataOptions {
  userFeedback?: UserFeedbackRecord[];
  lookbackMonths?: number;
}

function getCategoryId(transactions: DetectionTransaction[]): number | null {
  const categories = transactions.flatMap((txn) =>
    txn.splits
      .filter((split) => !split.is_system && !split.is_buffer)
      .map((split) => split.category_id)
  );
  return getMostCommon(categories);
}

function buildCandidate(
  groupTransactions: DetectionTransaction[],
  isAmountVariable: boolean
): CandidatePattern | null {
  const sorted = [...groupTransactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const cadence = inferCadence(sorted);

  if (!cadence) return null;
  if (cadence.frequency === 'unknown' && sorted.length < 2) {
    // explicit-text path may still proceed with unknown frequency
  } else if (cadence.frequency === 'unknown') {
    return null;
  }

  if (!validateMonthlyDateAnchor(sorted, cadence)) {
    return null;
  }

  // Recency is a confidence factor, not a hard reject — users often have stale imports.
  const isStale = cadence.medianInterval > 0 && !passesRecencyGate(sorted, cadence.medianInterval);

  const amounts = sorted.map((t) => Math.abs(t.total_amount));
  const expectedAmount =
    amounts.reduce((sum, val) => sum + val, 0) / Math.max(amounts.length, 1);
  const amountVariance = Math.sqrt(calculateVariance(amounts));
  const amountCV = calculateCV(amounts);

  return {
    merchantGroupId: sorted[0].merchant_group_id,
    merchantName: sorted[0].merchant_name,
    transactions: sorted,
    transactionType: sorted[0].transaction_type,
    accountId: sorted[0].account_id,
    creditCardId: sorted[0].credit_card_id,
    occurrenceCount: sorted.length,
    frequency: cadence.frequency,
    medianInterval: cadence.medianInterval,
    intervalMAD: cadence.intervalMAD,
    dayOfMonth: cadence.dayOfMonth,
    dayOfWeek: cadence.dayOfWeek,
    dayOfMonthMAD: cadence.dayOfMonthMAD,
    dateAnchorType: cadence.dateAnchorType,
    expectedAmount,
    amountVariance,
    amountCV,
    isAmountVariable,
    chargeClass: isAmountVariable ? 'variable_bill' : 'fixed_bill',
    categoryId: getCategoryId(sorted),
    categoryNames: sorted.flatMap((txn) =>
      txn.splits
        .filter((s) => !s.is_system && !s.is_buffer)
        .map((s) => s.category_name)
    ),
    categoryConsensus: 0,
    descriptions: sorted.map((t) => t.description),
  };
}

function candidateToPattern(
  candidate: CandidatePattern,
  classification: ReturnType<typeof classifyCandidate>
): RecurringPattern {
  const lastDate = candidate.transactions[candidate.transactions.length - 1].date;
  const nextExpectedDate =
    candidate.occurrenceCount === 1 || candidate.frequency === 'unknown'
      ? null
      : formatDateISO(
          calculateNextDate(
            new Date(lastDate),
            candidate.frequency,
            candidate.dayOfMonth
          )
        );

  return {
    merchantGroupId: candidate.merchantGroupId,
    merchantName: candidate.merchantName,
    frequency: candidate.frequency,
    expectedAmount: candidate.expectedAmount,
    amountVariance: candidate.amountVariance,
    isAmountVariable: candidate.isAmountVariable,
    transactionType: candidate.transactionType,
    categoryId: candidate.categoryId,
    accountId: candidate.accountId,
    creditCardId: candidate.creditCardId,
    involuntaryScore: classification.involuntaryScore,
    evidenceScore: classification.evidenceScore,
    confidenceScore: classification.finalConfidence,
    chargeClass: classification.chargeClass,
    detectionPath: classification.detectionPath,
    occurrenceCount: candidate.occurrenceCount,
    lastOccurrenceDate: lastDate,
    nextExpectedDate,
    transactionIds: candidate.transactions.map((t) => t.id),
    dateAnchorType: candidate.dateAnchorType,
    dayOfMonth: candidate.dayOfMonth,
    dayOfWeek: candidate.dayOfWeek,
    medianInterval: candidate.medianInterval,
    amountCV: candidate.amountCV,
    classificationSignals: classification.signals,
    descriptionPattern: candidate.descriptions[0] || null,
  };
}

function processTransactionSet(
  transactions: DetectionTransaction[],
  userFeedback: UserFeedbackRecord[],
  patterns: RecurringPattern[],
  processedKeys: Set<string>
) {
  if (transactions.length === 0) return;

  const segment = segmentByGap(transactions);
  const amounts = segment.map((t) => Math.abs(t.total_amount));
  const variable = isVariableAmountCluster(amounts);

  const groupsToProcess: DetectionTransaction[][] = variable
    ? [segment]
    : groupBySimilarAmount(segment, 2);

  if (!variable && groupsToProcess.length === 0 && segment.length >= 1) {
    groupsToProcess.push(segment);
  }

  for (const groupTxns of groupsToProcess) {
    const candidate = buildCandidate(groupTxns, variable);
    if (!candidate) continue;

    const dedupeKey = [
      candidate.merchantGroupId,
      candidate.frequency,
      candidate.transactionType,
      variable ? 'variable' : Math.round(candidate.expectedAmount / 5) * 5,
    ].join('|');
    if (processedKeys.has(dedupeKey)) continue;

    const classification = classifyCandidate(candidate, userFeedback);
    const isStale =
      candidate.medianInterval > 0 &&
      !passesRecencyGate(candidate.transactions, candidate.medianInterval);

    let result = classification;
    if (isStale && !result.rejected) {
      result = {
        ...result,
        evidenceScore: Math.max(0, result.evidenceScore - 0.15),
        finalConfidence: Math.max(0, result.finalConfidence - 0.1),
        signals: [
          ...result.signals,
          { layer: 3, name: 'stale_data', value: -0.1, detail: 'Last occurrence outside recency window' },
        ],
      };
    }

    if (!passesConfidenceThreshold(result, candidate.occurrenceCount)) {
      continue;
    }

    processedKeys.add(dedupeKey);
    patterns.push(candidateToPattern(candidate, result));
  }
}

export function detectRecurringTransactionsFromData(
  transactions: DetectionTransaction[],
  options: DetectFromDataOptions = {}
): RecurringPattern[] {
  const userFeedback = options.userFeedback ?? [];
  const lookbackMonths = options.lookbackMonths ?? 15;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - lookbackMonths);
  const startIso = startDate.toISOString().split('T')[0];
  const endIso = endDate.toISOString().split('T')[0];

  const filtered = filterValidTransactions(
    transactions.filter((txn) => txn.date >= startIso && txn.date <= endIso)
  );

  const patterns: RecurringPattern[] = [];
  const processedKeys = new Set<string>();
  const candidateGroups = groupCandidates(filtered);

  for (const group of candidateGroups) {
    if (group.transactions.length === 1) {
      processTransactionSet(group.transactions, userFeedback, patterns, processedKeys);
      continue;
    }

    const spanMonths = monthsBetween(
      group.transactions[0].date,
      group.transactions[group.transactions.length - 1].date
    );
    const amounts = group.transactions.map((t) => Math.abs(t.total_amount));
    const variable = isVariableAmountCluster(amounts) && spanMonths >= 3;

    if (variable) {
      processTransactionSet(group.transactions, userFeedback, patterns, processedKeys);
      continue;
    }

    const amountGroups = groupBySimilarAmount(group.transactions, 2);
    if (amountGroups.length === 0) {
      processTransactionSet(group.transactions, userFeedback, patterns, processedKeys);
    } else {
      for (const amountGroup of amountGroups) {
        processTransactionSet(amountGroup, userFeedback, patterns, processedKeys);
      }
    }
  }

  return patterns.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

// Re-export types used by detection.ts
export type { RecurringPattern } from './types';
export type { UserFeedbackRecord } from './classification/classify-candidate';
