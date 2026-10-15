import type {
  CreateIncomeStreamRequest,
  IncomeStream,
  PayFrequency,
} from "./types";
import {
  calculateAggregateMonthlyGrossIncome,
  calculateAggregateMonthlyNetIncome,
  calculateStreamPreTaxDeductions,
  getActualPaychecksPerYear,
} from "./income-calculations";

export const payFrequencies: { value: PayFrequency; label: string }[] = [
  { value: "weekly", label: "Every week" },
  { value: "bi-weekly", label: "Every 2 weeks" },
  { value: "semi-monthly", label: "Twice a month" },
  { value: "monthly", label: "Every month" },
  { value: "quarterly", label: "Every quarter" },
  { value: "annually", label: "Once a year" },
];
export type IncomeBasis = "paycheck" | "month" | "year";
export function incomeMultiplier(basis: IncomeBasis, frequency: PayFrequency) {
  return basis === "year"
    ? 1
    : basis === "month"
      ? 12
      : getActualPaychecksPerYear(frequency);
}
export function incomeSummary(streams: IncomeStream[]) {
  const gross = calculateAggregateMonthlyGrossIncome(streams);
  const net = calculateAggregateMonthlyNetIncome(streams);
  const deductions = streams
    .filter((s) => s.include_in_budget)
    .reduce(
      (sum, s) =>
        sum +
        calculateStreamPreTaxDeductions(
          s.pre_tax_deduction_items || [],
          s.annual_income,
          s.pay_frequency,
          s.include_extra_paychecks,
        ),
      0,
    );
  return { gross, net, deductions, taxes: gross - deductions - net };
}
/** Validate the planning inputs before saving to the shared income API. */
export function validateIncomeSource(
  source: CreateIncomeStreamRequest,
): string | null {
  if (!source.name.trim()) return "Give this income source a name.";
  if (
    !Number.isFinite(source.annual_income) ||
    source.annual_income < 0 ||
    source.annual_income > 999999999
  )
    return "Enter a valid nonnegative pay amount.";
  if (
    !Number.isFinite(source.tax_rate) ||
    source.tax_rate! < 0 ||
    source.tax_rate! > 1
  )
    return "Enter an estimated tax rate between 0% and 100%.";
  if (!payFrequencies.some((f) => f.value === source.pay_frequency))
    return "Choose a pay schedule.";
  const perPaycheck =
    source.annual_income / getActualPaychecksPerYear(source.pay_frequency!);
  let deductions = 0;
  for (const item of source.pre_tax_deduction_items || []) {
    if (!item.name.trim()) return "Give each deduction a name.";
    if (
      !Number.isFinite(item.value) ||
      item.value < 0 ||
      (item.type === "percentage" && item.value > 100)
    )
      return "Enter valid nonnegative deductions; percentages cannot exceed 100%.";
    deductions +=
      item.type === "fixed" ? item.value : (perPaycheck * item.value) / 100;
  }
  if (deductions > perPaycheck + 0.000001)
    return "Pre-tax deductions cannot exceed gross pay per paycheck.";
  return null;
}
