// AI Integration Constants

export const USER_LIMITS = {
  daily: {
    chat: 15,
    categorization: 5,
    dashboard_insights: 1, // For dashboard widget insights
    total: 21, // Updated total: 15 + 5 + 1 = 21
  },
} as const;

export const GLOBAL_LIMITS = {
  requestsPerMinute: 60,
  tokensPerMinute: 300000,
  requestsPerDay: 1500,
} as const;

/**
 * Gemini model IDs — free-tier stable models by default.
 * Override via GEMINI_PRO_MODEL / GEMINI_FLASH_MODEL.
 * Pricing: https://ai.google.dev/gemini-api/docs/pricing
 * Billing: https://ai.google.dev/gemini-api/docs/billing
 *
 * Free of charge only on a Free Tier project (no billing linked).
 * Once billing is linked, every token is charged — there is no free allowance.
 *
 * Prefer stable Flash / Flash-Lite IDs that list "Free of charge" on pricing:
 *   gemini-3.5-flash, gemini-3.1-flash-lite
 * Avoid gemini-2.5-pro (expensive on paid) and gemini-2.5-flash* (404 for many new keys).
 * Avoid *-latest aliases for production — they can hot-swap to preview models.
 *
 * pro  = reasoning (chat, insights, merchant suggestions)
 * flash = fast / high-volume (transaction categorization)
 */
export const GEMINI_MODELS = {
  /** Reasoning tasks — chat, insights, merchant suggestions */
  pro: process.env.GEMINI_PRO_MODEL || 'gemini-3.5-flash',
  /** Fast tasks — transaction categorization */
  flash: process.env.GEMINI_FLASH_MODEL || 'gemini-3.1-flash-lite',
} as const;

export const CACHE_DURATION = {
  insights: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  categorization: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;
