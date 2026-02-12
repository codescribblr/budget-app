/**
 * Shared feature flag types and helpers for nav visibility.
 * Single source of truth for feature keys used in sidebar and command palette.
 *
 * When adding a new gated feature:
 * 1. Add the key to FEATURE_KEYS above.
 * 2. Add the feature definition to src/app/api/features/route.ts (FEATURES).
 * 3. Add the nav item with featureKey in app-sidebar.tsx navigationSections and command-palette.tsx navigationItems.
 * 4. On gated pages, pass featureKey explicitly to PremiumFeatureGate (e.g. featureKey="loans").
 */
export const FEATURE_KEYS = [
  'tags',
  'non_cash_assets',
  'monthly_funding_tracking',
  'category_types',
  'priority_system',
  'smart_allocation',
  'income_buffer',
  'goals',
  'loans',
  'advanced_reporting',
  'ai_chat',
  'automatic_imports',
  'retirement_planning',
  'recurring_transactions',
] as const;

export type FeatureName = (typeof FEATURE_KEYS)[number];

export interface NavItemWithOptionalFeature {
  featureKey?: string;
  featureFlag?: string;
}

/**
 * Returns whether a nav item should be shown based on feature flags.
 * Items without featureKey/featureFlag are always shown.
 */
export function shouldShowNavItem(
  item: NavItemWithOptionalFeature,
  flags: Partial<Record<FeatureName, boolean>>
): boolean {
  if (item.featureKey) {
    return flags[item.featureKey as FeatureName] === true;
  }
  if (item.featureFlag) {
    return item.featureFlag === 'income_buffer' && flags.income_buffer === true;
  }
  return true;
}
