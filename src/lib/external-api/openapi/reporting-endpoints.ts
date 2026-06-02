/**
 * Curated read-only endpoints for budget reporting and AI assistants.
 * Kept at 30 operations to satisfy tools with OpenAPI operation limits (e.g. ChatGPT Actions).
 */
export const REPORTING_API_OPERATIONS = [
  { method: 'GET', path: '/api/v1/me', scope: 'any valid key' },
  { method: 'GET', path: '/api/v1/dashboard', scope: 'reports:read' },
  { method: 'GET', path: '/api/v1/reports/dashboard', scope: 'reports:read' },
  { method: 'GET', path: '/api/v1/reports/net-worth', scope: 'reports:read' },
  { method: 'GET', path: '/api/v1/net-worth/snapshots', scope: 'reports:read' },
  { method: 'GET', path: '/api/v1/export', scope: 'backup:read' },

  { method: 'GET', path: '/api/v1/accounts', scope: 'accounts:read' },
  { method: 'GET', path: '/api/v1/accounts/:id', scope: 'accounts:read' },
  { method: 'GET', path: '/api/v1/accounts/:id/balance-history', scope: 'accounts:read' },

  { method: 'GET', path: '/api/v1/credit-cards', scope: 'credit_cards:read' },
  { method: 'GET', path: '/api/v1/credit-cards/:id', scope: 'credit_cards:read' },
  { method: 'GET', path: '/api/v1/credit-cards/:id/balance-history', scope: 'credit_cards:read' },

  { method: 'GET', path: '/api/v1/loans', scope: 'loans:read' },
  { method: 'GET', path: '/api/v1/loans/:id', scope: 'loans:read' },

  { method: 'GET', path: '/api/v1/non-cash-assets', scope: 'non_cash_assets:read' },
  { method: 'GET', path: '/api/v1/non-cash-assets/:id', scope: 'non_cash_assets:read' },

  { method: 'GET', path: '/api/v1/categories', scope: 'categories:read' },
  { method: 'GET', path: '/api/v1/categories/:id', scope: 'categories:read' },
  { method: 'GET', path: '/api/v1/categories/monthly-funding', scope: 'categories:read' },

  { method: 'GET', path: '/api/v1/transactions', scope: 'transactions:read' },
  { method: 'GET', path: '/api/v1/transactions/:id', scope: 'transactions:read' },
  { method: 'GET', path: '/api/v1/transactions/search', scope: 'transactions:read' },
  { method: 'GET', path: '/api/v1/transactions/duplicates', scope: 'transactions:read' },

  { method: 'GET', path: '/api/v1/goals', scope: 'goals:read' },
  { method: 'GET', path: '/api/v1/goals/:id/progress', scope: 'goals:read' },

  { method: 'GET', path: '/api/v1/income/streams', scope: 'income:read' },
  { method: 'GET', path: '/api/v1/income/settings', scope: 'income:read' },
  { method: 'GET', path: '/api/v1/income-buffer/status', scope: 'income_buffer:read' },

  { method: 'GET', path: '/api/v1/recurring-transactions', scope: 'recurring_transactions:read' },
  { method: 'GET', path: '/api/v1/pending-checks', scope: 'pending_checks:read' },
] as const;

export const REPORTING_API_OPERATION_COUNT = REPORTING_API_OPERATIONS.length;
