export type RecurringFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'bimonthly'
  | 'quarterly'
  | 'yearly'
  | 'custom'
  | 'unknown';

export type ChargeClass =
  | 'fixed_bill'
  | 'variable_bill'
  | 'income_payroll'
  | 'membership'
  | 'discretionary'
  | 'ambiguous';

export type DetectionPath =
  | 'explicit_text'
  | 'strong_signal'
  | 'standard'
  | 'high_variance'
  | 'reactivation';

export type DateAnchorType =
  | 'fixed_day'
  | 'month_start'
  | 'month_end'
  | 'nth_weekday'
  | 'interval'
  | 'unknown';

export type TrackingStatus =
  | 'suggested'
  | 'confirmed'
  | 'paused'
  | 'dismissed'
  | 'inactive';

export interface DetectionSplit {
  category_id: number;
  amount: number;
  category_name: string;
  is_system: boolean;
  is_buffer: boolean;
}

export interface DetectionTransaction {
  id: number;
  date: string;
  description: string;
  total_amount: number;
  transaction_type: 'income' | 'expense';
  merchant_group_id: number;
  merchant_name: string;
  account_id: number | null;
  credit_card_id: number | null;
  splits: DetectionSplit[];
}

export interface CadenceInfo {
  frequency: RecurringFrequency;
  medianInterval: number;
  intervalMAD: number;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  dateAnchorType: DateAnchorType;
  dayOfMonthMAD: number;
}

export interface SignalContribution {
  layer: number;
  name: string;
  value: number;
  detail?: string;
}

export interface RecurringPattern {
  merchantGroupId: number;
  merchantName: string;
  frequency: RecurringFrequency;
  expectedAmount: number;
  amountVariance: number;
  isAmountVariable: boolean;
  transactionType: 'income' | 'expense';
  categoryId: number | null;
  accountId: number | null;
  creditCardId: number | null;
  involuntaryScore: number;
  evidenceScore: number;
  confidenceScore: number;
  chargeClass: ChargeClass;
  detectionPath: DetectionPath;
  occurrenceCount: number;
  lastOccurrenceDate: string;
  nextExpectedDate: string | null;
  transactionIds: number[];
  dateAnchorType: DateAnchorType;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  medianInterval: number;
  amountCV: number;
  classificationSignals: SignalContribution[];
  descriptionPattern: string | null;
}

export interface ClassificationResult {
  involuntaryScore: number;
  evidenceScore: number;
  finalConfidence: number;
  chargeClass: ChargeClass;
  detectionPath: DetectionPath;
  signals: SignalContribution[];
  rejected: boolean;
  rejectReason?: string;
}

export interface CandidatePattern {
  merchantGroupId: number;
  merchantName: string;
  transactions: DetectionTransaction[];
  transactionType: 'income' | 'expense';
  accountId: number | null;
  creditCardId: number | null;
  occurrenceCount: number;
  frequency: RecurringFrequency;
  medianInterval: number;
  intervalMAD: number;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  dayOfMonthMAD: number;
  dateAnchorType: DateAnchorType;
  expectedAmount: number;
  amountVariance: number;
  amountCV: number;
  isAmountVariable: boolean;
  chargeClass: ChargeClass;
  categoryId: number | null;
  categoryNames: string[];
  categoryConsensus: number;
  descriptions: string[];
}
