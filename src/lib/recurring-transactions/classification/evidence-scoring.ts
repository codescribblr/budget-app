import type {
  CandidatePattern,
  ChargeClass,
  DetectionPath,
  RecurringFrequency,
} from '../types';
import {
  hasExplicitSubscriptionText,
  hasMembershipKeyword,
  hasPayrollKeyword,
} from './text-utils';

export function getMinimumOccurrences(input: {
  chargeClass: ChargeClass;
  frequency: RecurringFrequency;
  amountCV: number;
  involuntaryScore: number;
  hasExplicitSubscriptionText: boolean;
  hasStrongTextSignal: boolean;
  allowlisted: boolean;
  hasPayrollKeyword: boolean;
  hasMembershipKeyword: boolean;
}): number {
  if (input.chargeClass === 'discretionary') return Infinity;

  if (input.hasExplicitSubscriptionText) return 1;

  switch (input.chargeClass) {
    case 'variable_bill':
      return 4;
    case 'income_payroll':
      return input.hasPayrollKeyword ? 2 : 3;
    case 'membership':
      return input.hasMembershipKeyword ? 2 : 3;
    case 'fixed_bill':
    case 'ambiguous':
    default:
      if (input.allowlisted && input.amountCV < 0.05) return 2;
      if (input.involuntaryScore < 0.65 && !input.hasStrongTextSignal) return 4;
      if (input.frequency === 'weekly') return 6;
      if (input.frequency === 'biweekly') return 4;
      if (input.frequency === 'yearly') return 2;
      if (input.frequency === 'quarterly') return 3;
      return 3;
  }
}

export function computeEvidenceScore(candidate: CandidatePattern): number {
  const n = candidate.occurrenceCount;

  const occurrenceFactor =
    n >= 6 ? 1.0 :
    n === 5 ? 0.95 :
    n === 4 ? 0.9 :
    n === 3 ? 0.8 :
    n === 2 ? 0.65 :
    n === 1 ? 0.5 : 0;

  let cadenceQuality = 0.5;
  if (n >= 2 && candidate.medianInterval > 0) {
    cadenceQuality = 1 - Math.min(candidate.intervalMAD / candidate.medianInterval, 1);
  }

  let dateAnchorQuality = 0.5;
  if (n >= 3 && candidate.frequency === 'monthly') {
    dateAnchorQuality = 1 - Math.min(candidate.dayOfMonthMAD / 7, 1);
  }

  let amountConsistency = 0.5;
  if (candidate.chargeClass === 'variable_bill') {
    amountConsistency = 0.5;
  } else if (n >= 3) {
    amountConsistency = 1 - Math.min(candidate.amountCV / 0.3, 1);
  }

  return (
    occurrenceFactor * 0.4 +
    cadenceQuality * 0.3 +
    dateAnchorQuality * 0.2 +
    amountConsistency * 0.1
  );
}

export function computeFinalConfidence(
  involuntaryScore: number,
  evidenceScore: number,
  occurrenceCount: number,
  hasExplicitSubscriptionTextFlag: boolean
): number {
  if (occurrenceCount === 1 && hasExplicitSubscriptionTextFlag) {
    return Math.min(involuntaryScore * 0.85, 0.72);
  }

  const blended = involuntaryScore * 0.55 + evidenceScore * 0.45;
  if (involuntaryScore >= 0.75 && evidenceScore >= 0.85) {
    return Math.min(blended + 0.05, 1);
  }
  return Math.min(blended, 1);
}

export function inferDetectionPath(input: {
  occurrenceCount: number;
  hasExplicitSubscriptionText: boolean;
  allowlisted: boolean;
  amountCV: number;
  chargeClass: ChargeClass;
}): DetectionPath {
  if (input.occurrenceCount === 1 && input.hasExplicitSubscriptionText) {
    return 'explicit_text';
  }
  if (input.allowlisted && input.occurrenceCount === 2 && input.amountCV < 0.05) {
    return 'strong_signal';
  }
  if (input.chargeClass === 'variable_bill') {
    return 'high_variance';
  }
  return 'standard';
}

export function shouldSurfacePattern(input: {
  finalConfidence: number;
  chargeClass: ChargeClass;
  occurrenceCount: number;
  minOccurrences: number;
  rejected: boolean;
}): boolean {
  if (input.rejected || input.occurrenceCount < input.minOccurrences) {
    return false;
  }

  if (input.chargeClass === 'variable_bill') {
    return input.finalConfidence >= 0.45;
  }

  if (input.occurrenceCount === 1) {
    return input.finalConfidence >= 0.55;
  }

  return input.finalConfidence >= 0.45;
}

export function buildCandidateTextFlags(
  merchantName: string,
  descriptions: string[],
  transactionType: 'income' | 'expense'
) {
  const text = [merchantName, ...descriptions].join(' ');
  return {
    hasExplicitSubscriptionText: hasExplicitSubscriptionText(text),
    hasPayrollKeyword: transactionType === 'income' && hasPayrollKeyword(text),
    hasMembershipKeyword: hasMembershipKeyword(text),
    hasStrongTextSignal:
      hasExplicitSubscriptionText(text) ||
      hasMembershipKeyword(text) ||
      (transactionType === 'income' && hasPayrollKeyword(text)),
  };
}
