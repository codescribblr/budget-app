/**
 * Shared income calculation utilities for multiple income streams.
 * Used by dashboard, income page, forecast, and AI context.
 */

import type { IncomeStream, PayFrequency, PreTaxDeductionItem } from '@/lib/types';

export function getPaychecksPerMonth(payFrequency: PayFrequency, includeExtraPaychecks: boolean): number {
  switch (payFrequency) {
    case 'weekly':
      return 52 / 12;
    case 'bi-weekly':
      return includeExtraPaychecks ? 26 / 12 : 24 / 12;
    case 'semi-monthly':
      return 2;
    case 'monthly':
      return 1;
    case 'quarterly':
      return 4 / 12;
    case 'annually':
      return 1 / 12;
    default:
      return 1;
  }
}

export function getActualPaychecksPerYear(payFrequency: PayFrequency): number {
  switch (payFrequency) {
    case 'weekly':
      return 52;
    case 'bi-weekly':
      return 26;
    case 'semi-monthly':
      return 24;
    case 'monthly':
      return 12;
    case 'quarterly':
      return 4;
    case 'annually':
      return 1;
    default:
      return 12;
  }
}

/**
 * Calculate monthly gross income for a single stream based on pay frequency
 */
export function calculateStreamMonthlyGross(
  annualIncome: number,
  payFrequency: PayFrequency,
  includeExtraPaychecks: boolean
): number {
  switch (payFrequency) {
    case 'weekly':
      return (annualIncome / 52) * (52 / 12);
    case 'bi-weekly':
      if (includeExtraPaychecks) {
        return annualIncome / 12;
      } else {
        return (annualIncome / 26) * 2;
      }
    case 'semi-monthly':
      return (annualIncome / 24) * 2;
    case 'monthly':
      return annualIncome / 12;
    case 'quarterly':
      return (annualIncome / 4) / 3;
    case 'annually':
      return annualIncome / 12;
    default:
      return annualIncome / 12;
  }
}

/**
 * Calculate total monthly pre-tax deductions for a stream
 */
export function calculateStreamPreTaxDeductions(
  items: PreTaxDeductionItem[],
  annualIncome: number,
  payFrequency: PayFrequency,
  includeExtraPaychecks: boolean
): number {
  const paychecksPerMonth = getPaychecksPerMonth(payFrequency, includeExtraPaychecks);
  const actualPaychecksPerYear = getActualPaychecksPerYear(payFrequency);

  return items.reduce((total, item) => {
    if (item.type === 'fixed') {
      return total + item.value * paychecksPerMonth;
    } else {
      const grossPerPaycheck = annualIncome / actualPaychecksPerYear;
      const deductionPerPaycheck = grossPerPaycheck * (item.value / 100);
      return total + deductionPerPaycheck * paychecksPerMonth;
    }
  }, 0);
}

/**
 * Calculate monthly net income for a single stream
 */
export function calculateStreamMonthlyNet(stream: IncomeStream): number {
  const monthlyGross = calculateStreamMonthlyGross(
    stream.annual_income,
    stream.pay_frequency,
    stream.include_extra_paychecks
  );
  const preTaxDeductions = calculateStreamPreTaxDeductions(
    stream.pre_tax_deduction_items || [],
    stream.annual_income,
    stream.pay_frequency,
    stream.include_extra_paychecks
  );
  const annualTaxableIncome = stream.annual_income - preTaxDeductions * 12;
  const taxesPerMonth = (annualTaxableIncome * stream.tax_rate) / 12;
  return monthlyGross - taxesPerMonth - preTaxDeductions;
}

/**
 * Calculate aggregate monthly net income from streams that are included in budget
 */
export function calculateAggregateMonthlyNetIncome(streams: IncomeStream[]): number {
  return streams
    .filter((s) => s.include_in_budget)
    .reduce((sum, stream) => sum + calculateStreamMonthlyNet(stream), 0);
}

/**
 * Calculate aggregate monthly gross income from streams that are included in budget
 */
export function calculateAggregateMonthlyGrossIncome(streams: IncomeStream[]): number {
  return streams
    .filter((s) => s.include_in_budget)
    .reduce(
      (sum, stream) =>
        sum +
        calculateStreamMonthlyGross(
          stream.annual_income,
          stream.pay_frequency,
          stream.include_extra_paychecks
        ),
      0
    );
}
