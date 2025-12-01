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

export const GEMINI_MODELS = {
  pro: process.env.GEMINI_PRO_MODEL || 'gemini-2.0-flash-exp',
  flash: process.env.GEMINI_FLASH_MODEL || 'gemini-2.0-flash-exp',
} as const;

export const CACHE_DURATION = {
  insights: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  categorization: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

