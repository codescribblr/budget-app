import type { FeatureName } from '@/lib/feature-flags';

/**
 * Persisted under settings key `dashboard_card_visibility` as JSON.
 * Budget categories are always shown and are not part of this map.
 */
export const DASHBOARD_CARD_VISIBILITY_KEY = 'dashboard_card_visibility';

export const DASHBOARD_CARD_IDS = [
  'net_worth',
  'summary',
  'ai_insights',
  'accounts',
  'credit_cards',
  'pending_checks',
  'loans',
  'non_cash_assets',
  'income_buffer',
  'goals',
] as const;

export type DashboardCardId = (typeof DASHBOARD_CARD_IDS)[number];

export type DashboardCardVisibility = Record<DashboardCardId, boolean>;

export const DEFAULT_DASHBOARD_CARD_VISIBILITY: DashboardCardVisibility = {
  net_worth: true,
  summary: true,
  ai_insights: true,
  accounts: true,
  credit_cards: true,
  pending_checks: true,
  loans: true,
  non_cash_assets: true,
  income_buffer: true,
  goals: true,
};

export const DASHBOARD_CARD_OPTIONS: {
  id: DashboardCardId;
  title: string;
  description: string;
  /**
   * When set, the card only appears on the dashboard for Premium users with this feature enabled.
   * The settings row shows Upgrade → Enable feature → visibility toggle in that order.
   */
  requiresPremiumFeature?: FeatureName;
}[] = [
  {
    id: 'net_worth',
    title: 'Net worth',
    description: 'Summary of total net worth from Retirement Planning.',
    requiresPremiumFeature: 'retirement_planning',
  },
  {
    id: 'summary',
    title: 'Summary metrics',
    description: 'The row of totals: monies, envelopes, credit cards, pending checks, and available to save.',
  },
  {
    id: 'ai_insights',
    title: 'AI insights',
    description: 'Suggestions and insights from the AI assistant.',
    requiresPremiumFeature: 'ai_chat',
  },
  {
    id: 'accounts',
    title: 'Accounts',
    description: 'Cash account balances on the dashboard.',
  },
  {
    id: 'credit_cards',
    title: 'Credit cards',
    description: 'Credit card balances on the dashboard.',
  },
  {
    id: 'pending_checks',
    title: 'Pending checks',
    description: 'Outstanding checks not yet cleared.',
  },
  {
    id: 'loans',
    title: 'Loans',
    description: 'Loan balances on the dashboard.',
    requiresPremiumFeature: 'loans',
  },
  {
    id: 'non_cash_assets',
    title: 'Non-cash assets',
    description: 'Investments and other assets tracked on the dashboard.',
    requiresPremiumFeature: 'non_cash_assets',
  },
  {
    id: 'income_buffer',
    title: 'Income buffer',
    description: 'Income buffer status when the buffer is enabled for your budget.',
    requiresPremiumFeature: 'income_buffer',
  },
  {
    id: 'goals',
    title: 'Goals',
    description: 'Active savings goals on the dashboard.',
    requiresPremiumFeature: 'goals',
  },
];

export function parseDashboardCardVisibility(raw: string | undefined | null): DashboardCardVisibility {
  if (!raw || typeof raw !== 'string') {
    return { ...DEFAULT_DASHBOARD_CARD_VISIBILITY };
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next = { ...DEFAULT_DASHBOARD_CARD_VISIBILITY };
    for (const id of DASHBOARD_CARD_IDS) {
      if (typeof parsed[id] === 'boolean') {
        next[id] = parsed[id] as boolean;
      }
    }
    return next;
  } catch {
    return { ...DEFAULT_DASHBOARD_CARD_VISIBILITY };
  }
}

export function serializeDashboardCardVisibility(visibility: DashboardCardVisibility): string {
  return JSON.stringify(visibility);
}
