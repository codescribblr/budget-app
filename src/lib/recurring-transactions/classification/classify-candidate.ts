import type {
  CandidatePattern,
  ChargeClass,
  ClassificationResult,
  DetectionPath,
} from '../types';
import { buildCategoryProfile } from './category-profile';
import { scoreBehavioralSignals } from './behavioral-signals';
import {
  buildCandidateTextFlags,
  computeEvidenceScore,
  computeFinalConfidence,
  getMinimumOccurrences,
  inferDetectionPath,
} from './evidence-scoring';
import { isBlocklistEscape, matchMerchantRegistry } from './merchant-registry';
import { concatTransactionText } from './text-utils';
import { scoreTextSignals } from './text-signals';

export interface UserFeedbackRecord {
  merchant_group_id: number;
  amount_bucket: number | null;
  frequency: string;
  feedback_type: 'confirmed' | 'dismissed';
}

function inferChargeClass(input: {
  registry: ReturnType<typeof matchMerchantRegistry>;
  categoryScore: number;
  transactionType: 'income' | 'expense';
  isAmountVariable: boolean;
  hasMembershipKeyword: boolean;
  hasPayrollKeyword: boolean;
  involuntaryScore: number;
}): ChargeClass {
  if (input.registry.membershipException || input.hasMembershipKeyword) {
    return 'membership';
  }
  if (input.transactionType === 'income' && input.hasPayrollKeyword) {
    return 'income_payroll';
  }
  if (input.isAmountVariable) {
    return 'variable_bill';
  }
  if (input.registry.variableBillHint || input.categoryScore > 0) {
    if (input.isAmountVariable) return 'variable_bill';
  }
  if (input.involuntaryScore < 0.45) {
    return 'discretionary';
  }
  if (input.isAmountVariable) return 'variable_bill';
  return 'fixed_bill';
}

function hasDismissedFeedback(
  feedback: UserFeedbackRecord[],
  candidate: CandidatePattern
): boolean {
  return feedback.some((record) => {
    if (record.feedback_type !== 'dismissed') return false;
    if (record.merchant_group_id !== candidate.merchantGroupId) return false;
    if (record.frequency !== candidate.frequency) return false;
    if (candidate.isAmountVariable) return record.amount_bucket == null;
    const bucket = Math.round(candidate.expectedAmount / 5) * 5;
    return record.amount_bucket === bucket;
  });
}

export function classifyCandidate(
  candidate: CandidatePattern,
  userFeedback: UserFeedbackRecord[] = []
): ClassificationResult {
  const signals: ClassificationResult['signals'] = [];

  if (hasDismissedFeedback(userFeedback, candidate)) {
    return {
      involuntaryScore: 0,
      evidenceScore: 0,
      finalConfidence: 0,
      chargeClass: 'discretionary',
      detectionPath: 'standard',
      signals,
      rejected: true,
      rejectReason: 'Previously dismissed by user',
    };
  }

  const text = concatTransactionText(candidate.merchantName, candidate.descriptions);
  const registry = matchMerchantRegistry(text);
  const textFlags = buildCandidateTextFlags(
    candidate.merchantName,
    candidate.descriptions,
    candidate.transactionType
  );

  if (
    registry.blocked &&
    !registry.allowlisted &&
    !registry.membershipException &&
    !isBlocklistEscape(
      candidate.amountCV,
      candidate.frequency,
      registry.allowlisted,
      registry.membershipException
    )
  ) {
    return {
      involuntaryScore: 0,
      evidenceScore: 0,
      finalConfidence: 0,
      chargeClass: 'discretionary',
      detectionPath: 'standard',
      signals,
      rejected: true,
      rejectReason: `Blocklisted merchant: ${registry.label}`,
    };
  }

  let score = 0.5;

  if (registry.allowlisted) {
    score += 0.2;
    signals.push({ layer: 4, name: 'subscription_allowlist', value: 0.2, detail: registry.label || undefined });
  }
  if (registry.variableBillHint) {
    score += 0.1;
    signals.push({ layer: 4, name: 'variable_bill_hint', value: 0.1, detail: registry.label || undefined });
  }

  const category = buildCategoryProfile(candidate.transactions);
  if (category.weightedScore !== 0) {
    score += category.weightedScore;
    signals.push({
      layer: 1,
      name: 'budget_category',
      value: category.weightedScore,
      detail: category.dominantCategory || undefined,
    });
  }

  const textScore = scoreTextSignals(
    candidate.merchantName,
    candidate.descriptions,
    candidate.transactionType
  );
  score += textScore.total;
  signals.push(...textScore.contributions);

  let chargeClass = inferChargeClass({
    registry,
    categoryScore: category.weightedScore,
    transactionType: candidate.transactionType,
    isAmountVariable: candidate.isAmountVariable,
    hasMembershipKeyword: textFlags.hasMembershipKeyword,
    hasPayrollKeyword: textFlags.hasPayrollKeyword,
    involuntaryScore: score,
  });

  if (candidate.isAmountVariable) {
    chargeClass = 'variable_bill';
  }

  const behavioral = scoreBehavioralSignals({
    transactions: candidate.transactions,
    amountCV: candidate.amountCV,
    frequency: candidate.frequency,
    chargeClass,
    accountId: candidate.accountId,
    creditCardId: candidate.creditCardId,
  });
  score += behavioral.total;
  signals.push(...behavioral.contributions);

  if (registry.blocked && chargeClass !== 'membership' && score < 0.65) {
    chargeClass = 'discretionary';
  }

  if (chargeClass === 'discretionary' || (registry.blocked && score < 0.55)) {
    return {
      involuntaryScore: Math.max(0, Math.min(1, score)),
      evidenceScore: 0,
      finalConfidence: 0,
      chargeClass: 'discretionary',
      detectionPath: 'standard',
      signals,
      rejected: true,
      rejectReason: 'Classified as discretionary spending',
    };
  }

  score = Math.max(0, Math.min(1, score));

  const minOccurrences = getMinimumOccurrences({
    chargeClass,
    frequency: candidate.frequency,
    amountCV: candidate.amountCV,
    involuntaryScore: score,
    hasExplicitSubscriptionText: textFlags.hasExplicitSubscriptionText,
    hasStrongTextSignal: textFlags.hasStrongTextSignal || registry.allowlisted,
    allowlisted: registry.allowlisted,
    hasPayrollKeyword: textFlags.hasPayrollKeyword,
    hasMembershipKeyword: textFlags.hasMembershipKeyword,
  });

  if (candidate.occurrenceCount < minOccurrences) {
    return {
      involuntaryScore: score,
      evidenceScore: 0,
      finalConfidence: 0,
      chargeClass,
      detectionPath: 'standard',
      signals,
      rejected: true,
      rejectReason: `Requires ${minOccurrences} occurrences, found ${candidate.occurrenceCount}`,
    };
  }

  const evidenceScore = computeEvidenceScore(candidate);
  const finalConfidence = computeFinalConfidence(
    score,
    evidenceScore,
    candidate.occurrenceCount,
    textFlags.hasExplicitSubscriptionText
  );

  const detectionPath: DetectionPath = inferDetectionPath({
    occurrenceCount: candidate.occurrenceCount,
    hasExplicitSubscriptionText: textFlags.hasExplicitSubscriptionText,
    allowlisted: registry.allowlisted,
    amountCV: candidate.amountCV,
    chargeClass,
  });

  return {
    involuntaryScore: score,
    evidenceScore,
    finalConfidence,
    chargeClass,
    detectionPath,
    signals,
    rejected: false,
  };
}

export function passesConfidenceThreshold(
  result: ClassificationResult,
  occurrenceCount: number
): boolean {
  if (result.rejected) return false;
  if (result.chargeClass === 'variable_bill') {
    return result.finalConfidence >= 0.45;
  }
  if (occurrenceCount === 1) {
    return result.finalConfidence >= 0.55;
  }
  return result.finalConfidence >= 0.7;
}
