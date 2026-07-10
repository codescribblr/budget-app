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

// Free-tier models (Google AI Studio): gemini-2.5-flash, gemini-2.5-flash-lite.
// Avoid gemini-2.5-pro and gemini-flash-latest — Pro is ~25x costlier on paid tier,
// and -latest aliases can resolve to preview models outside the free tier.
export const GEMINI_MODELS = {
  // Reasoning tasks: chat, insights, merchant suggestions
  pro: process.env.GEMINI_PRO_MODEL || 'gemini-2.5-flash',
  // Fast tasks: transaction categorization
  flash: process.env.GEMINI_FLASH_MODEL || 'gemini-2.5-flash-lite',
} as const;

export const CACHE_DURATION = {
  insights: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  categorization: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;


