import type { ChargeClass, DetectionTransaction, RecurringFrequency, SignalContribution } from '../types';
import { monthsBetween } from '../utils/dates';

export function scoreBehavioralSignals(input: {
  transactions: DetectionTransaction[];
  amountCV: number;
  frequency: RecurringFrequency;
  chargeClass: ChargeClass;
  accountId: number | null;
  creditCardId: number | null;
}): { total: number; contributions: SignalContribution[] } {
  const { transactions, amountCV, frequency, chargeClass } = input;
  const n = transactions.length;
  const contributions: SignalContribution[] = [];
  let total = 0;

  if (n >= 3 && chargeClass !== 'variable_bill') {
    if (amountCV < 0.05) {
      total += 0.25;
      contributions.push({ layer: 3, name: 'amount_stability_high', value: 0.25 });
    } else if (amountCV < 0.15) {
      total += 0.1;
      contributions.push({ layer: 3, name: 'amount_stability_medium', value: 0.1 });
    } else if (amountCV > 0.3) {
      total -= 0.2;
      contributions.push({ layer: 3, name: 'amount_instability', value: -0.2 });
    }
  }

  if (n >= 2) {
    const spanMonths = Math.max(
      monthsBetween(transactions[0].date, transactions[transactions.length - 1].date),
      1 / 30
    );
    const txnsPerMonth = n / spanMonths;

    if (txnsPerMonth > 8) {
      total -= 0.35;
      contributions.push({ layer: 3, name: 'high_frequency', value: -0.35 });
    } else if (txnsPerMonth > 4) {
      total -= 0.25;
      contributions.push({ layer: 3, name: 'elevated_frequency', value: -0.25 });
    } else if (txnsPerMonth > 2) {
      total -= 0.15;
      contributions.push({ layer: 3, name: 'moderate_frequency', value: -0.15 });
    }

    if (
      chargeClass === 'variable_bill' &&
      txnsPerMonth <= 1.2 &&
      frequency === 'monthly' &&
      n >= 4
    ) {
      total += 0.2;
      contributions.push({ layer: 3, name: 'monthly_utility_pattern', value: 0.2 });
    }
  }

  if (
    (frequency === 'weekly' || frequency === 'biweekly') &&
    n >= 4
  ) {
    const weekendCount = transactions.filter((txn) => {
      const day = new Date(txn.date).getDay();
      return day === 0 || day === 6;
    }).length;
    if (weekendCount / n > 0.6) {
      total -= 0.2;
      contributions.push({ layer: 3, name: 'weekend_concentration', value: -0.2 });
    }
  }

  if (n >= 2) {
    const accountIds = transactions.map((t) => t.account_id);
    const cardIds = transactions.map((t) => t.credit_card_id);
    const sameAccount =
      accountIds.filter((id) => id === accountIds[0]).length / n >= 0.9;
    const sameCard =
      cardIds.filter((id) => id === cardIds[0]).length / n >= 0.9;
    if (sameAccount || sameCard) {
      total += 0.1;
      contributions.push({ layer: 3, name: 'payment_source_consistency', value: 0.1 });
    }
  }

  const amounts = transactions.map((t) => Math.abs(t.total_amount));
  const hasSubscriptionPricing = amounts.some((amount) => {
    const cents = Math.round((amount % 1) * 100);
    return cents === 99 || amount % 1 === 0;
  });
  if (hasSubscriptionPricing && n >= 1) {
    const maxAmount = Math.max(...amounts);
    if (maxAmount <= 500) {
      total += 0.1;
      contributions.push({ layer: 3, name: 'subscription_pricing', value: 0.1 });
    }
  }

  return { total: Math.max(-0.35, Math.min(0.35, total)), contributions };
}
