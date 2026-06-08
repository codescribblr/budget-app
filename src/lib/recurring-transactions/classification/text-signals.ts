import type { SignalContribution } from '../types';
import {
  concatTransactionText,
  containsKeyword,
  hasBillKeyword,
  hasExplicitSubscriptionText,
  hasMembershipKeyword,
  hasPayrollKeyword,
} from './text-utils';

const SUBSCRIPTION_KEYWORDS = [
  'NETFLIX',
  'SPOTIFY',
  'HULU',
  'DISNEY+',
  'DISNEY PLUS',
  'HBO',
  'MAX',
  'APPLE.COM/BILL',
  'ADOBE',
  'MICROSOFT',
  'GOOGLE *YOUTUBE',
  'GOOGLE *STORAGE',
  'DROPBOX',
  'CHATGPT',
  'OPENAI',
  'GITHUB',
  'PATREON',
  'AMAZON PRIME',
  'AMZN PRIME',
];

const DISCRETIONARY_KEYWORDS = [
  'MCDONALD',
  'BURGER KING',
  'WENDY',
  'TACO BELL',
  'CHICK-FIL-A',
  'CHIPOTLE',
  'STARBUCKS',
  'DUNKIN',
  'SUBWAY',
  'PANERA',
  'DOMINO',
  'PIZZA HUT',
  'WALMART',
  'TARGET',
  'COSTCO WHSE',
  'KROGER',
  'PUBLIX',
  'ALDI',
  'SHELL OIL',
  'EXXON',
  'CHEVRON',
  'MARATHON',
  'SPEEDWAY',
  'WAWA',
  'SHEETZ',
  'AMAZON MKTPL',
  'AMZN MKTP',
];

export function scoreTextSignals(
  merchantName: string,
  descriptions: string[],
  transactionType: 'income' | 'expense'
): { total: number; contributions: SignalContribution[] } {
  const text = concatTransactionText(merchantName, descriptions);
  const contributions: SignalContribution[] = [];
  let total = 0;

  if (hasExplicitSubscriptionText(text)) {
    total += 0.25;
    contributions.push({ layer: 2, name: 'explicit_subscription_text', value: 0.25 });
  } else if (hasBillKeyword(text)) {
    total += 0.25;
    contributions.push({ layer: 2, name: 'bill_keyword', value: 0.25 });
  }

  if (transactionType === 'income' && hasPayrollKeyword(text)) {
    total += 0.25;
    contributions.push({ layer: 2, name: 'payroll_keyword', value: 0.25 });
  }

  const subscriptionHit = containsKeyword(text, SUBSCRIPTION_KEYWORDS);
  if (subscriptionHit) {
    total += 0.2;
    contributions.push({
      layer: 2,
      name: 'subscription_merchant_keyword',
      value: 0.2,
      detail: subscriptionHit,
    });
  }

  if (hasMembershipKeyword(text)) {
    total += 0.15;
    contributions.push({ layer: 2, name: 'membership_keyword', value: 0.15 });
  }

  const discretionaryHit = containsKeyword(text, DISCRETIONARY_KEYWORDS);
  if (discretionaryHit) {
    total -= 0.2;
    contributions.push({
      layer: 2,
      name: 'discretionary_merchant_keyword',
      value: -0.2,
      detail: discretionaryHit,
    });
  }

  return { total: Math.max(-0.2, Math.min(0.25, total)), contributions };
}
