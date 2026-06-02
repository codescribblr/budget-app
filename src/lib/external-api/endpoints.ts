export const EXTERNAL_API_ENDPOINTS = [
  { method: 'GET', path: '/api/v1/me', scope: 'any valid key' },
  { method: 'GET', path: '/api/v1/export', scope: 'backup:read' },
  { method: 'GET', path: '/api/v1/dashboard', scope: 'reports:read' },
  { method: 'GET', path: '/api/v1/features', scope: 'settings:read' },

  { method: 'GET|POST', path: '/api/v1/categories', scope: 'categories:*' },
  { method: 'GET|PATCH|DELETE', path: '/api/v1/categories/:id', scope: 'categories:*' },
  { method: 'PATCH', path: '/api/v1/categories/reorder', scope: 'categories:write' },
  { method: 'PATCH', path: '/api/v1/categories/bulk-archive', scope: 'categories:write' },
  { method: 'GET', path: '/api/v1/categories/monthly-funding', scope: 'categories:read' },
  { method: 'POST', path: '/api/v1/allocations/manual', scope: 'categories:write' },

  { method: 'GET|POST', path: '/api/v1/accounts', scope: 'accounts:*' },
  { method: 'GET|PATCH|DELETE', path: '/api/v1/accounts/:id', scope: 'accounts:*' },
  { method: 'GET', path: '/api/v1/accounts/:id/balance-history', scope: 'accounts:read' },

  { method: 'GET|POST', path: '/api/v1/credit-cards', scope: 'credit_cards:*' },
  { method: 'GET|PATCH|DELETE', path: '/api/v1/credit-cards/:id', scope: 'credit_cards:*' },
  { method: 'GET', path: '/api/v1/credit-cards/:id/balance-history', scope: 'credit_cards:read' },

  { method: 'GET|POST', path: '/api/v1/transactions', scope: 'transactions:*' },
  { method: 'GET|PATCH|DELETE', path: '/api/v1/transactions/:id', scope: 'transactions:*' },
  { method: 'GET', path: '/api/v1/transactions/search', scope: 'transactions:read' },
  { method: 'GET', path: '/api/v1/transactions/duplicates', scope: 'transactions:read' },

  { method: 'GET|POST', path: '/api/v1/goals', scope: 'goals:*' },
  { method: 'GET|PATCH|DELETE', path: '/api/v1/goals/:id', scope: 'goals:*' },
  { method: 'GET', path: '/api/v1/goals/:id/progress', scope: 'goals:read' },

  { method: 'GET|POST', path: '/api/v1/loans', scope: 'loans:*' },
  { method: 'GET|PATCH|DELETE', path: '/api/v1/loans/:id', scope: 'loans:*' },

  { method: 'GET|POST', path: '/api/v1/non-cash-assets', scope: 'non_cash_assets:*' },
  { method: 'GET|PATCH|DELETE', path: '/api/v1/non-cash-assets/:id', scope: 'non_cash_assets:*' },

  { method: 'GET|POST', path: '/api/v1/pending-checks', scope: 'pending_checks:*' },
  { method: 'GET|PATCH|DELETE', path: '/api/v1/pending-checks/:id', scope: 'pending_checks:*' },

  { method: 'GET|POST', path: '/api/v1/recurring-transactions', scope: 'recurring_transactions:*' },
  { method: 'GET|PATCH|DELETE', path: '/api/v1/recurring-transactions/:id', scope: 'recurring_transactions:*' },
  { method: 'POST', path: '/api/v1/recurring-transactions/detect', scope: 'recurring_transactions:write' },

  { method: 'GET|POST', path: '/api/v1/income/streams', scope: 'income:*' },
  { method: 'GET|PATCH|DELETE', path: '/api/v1/income/streams/:id', scope: 'income:*' },
  { method: 'GET|POST', path: '/api/v1/income/settings', scope: 'income:*' },
  { method: 'GET|POST', path: '/api/v1/income/deductions', scope: 'income:*' },

  { method: 'GET', path: '/api/v1/income-buffer/status', scope: 'income_buffer:read' },
  { method: 'POST', path: '/api/v1/income-buffer/add', scope: 'income_buffer:write' },
  { method: 'POST', path: '/api/v1/income-buffer/fund-month', scope: 'income_buffer:write' },

  { method: 'GET|POST', path: '/api/v1/tags', scope: 'tags:*' },
  { method: 'GET|PATCH|DELETE', path: '/api/v1/tags/:id', scope: 'tags:*' },
  { method: 'GET|POST', path: '/api/v1/tags/rules', scope: 'tags:*' },
  { method: 'POST', path: '/api/v1/tags/bulk-assign', scope: 'tags:write' },

  { method: 'GET|POST', path: '/api/v1/merchants/groups', scope: 'merchants:*' },
  { method: 'GET|PATCH|DELETE', path: '/api/v1/merchants/groups/:id', scope: 'merchants:*' },
  { method: 'GET|POST', path: '/api/v1/merchants/mappings', scope: 'merchants:*' },
  { method: 'GET|POST', path: '/api/v1/merchants/category-rules', scope: 'merchants:*' },
  { method: 'GET|PATCH|DELETE', path: '/api/v1/merchants/category-rules/:id', scope: 'merchants:*' },
  { method: 'GET', path: '/api/v1/merchants/recommendations', scope: 'merchants:read' },

  { method: 'GET|POST', path: '/api/v1/imports/templates', scope: 'imports:*' },
  { method: 'GET|POST', path: '/api/v1/imports/setups', scope: 'imports:*' },
  { method: 'GET|PATCH|DELETE', path: '/api/v1/imports/setups/:id', scope: 'imports:*' },
  { method: 'GET', path: '/api/v1/imports/queue', scope: 'imports:read' },
  { method: 'GET|PATCH', path: '/api/v1/imports/queue/:id', scope: 'imports:*' },
  { method: 'POST', path: '/api/v1/imports/queue/:id/approve', scope: 'imports:write' },
  { method: 'POST', path: '/api/v1/imports/queue/:id/reject', scope: 'imports:write' },
  { method: 'POST', path: '/api/v1/imports/queue/approve-batch', scope: 'imports:write' },

  { method: 'GET|POST', path: '/api/v1/settings', scope: 'settings:*' },
  { method: 'GET', path: '/api/v1/notifications', scope: 'notifications:read' },
  { method: 'GET', path: '/api/v1/notifications/unread-count', scope: 'notifications:read' },
  { method: 'GET|PATCH|DELETE', path: '/api/v1/notifications/:id', scope: 'notifications:*' },
  { method: 'GET|PATCH', path: '/api/v1/notifications/preferences', scope: 'notifications:*' },

  { method: 'GET', path: '/api/v1/collaborators', scope: 'collaborators:read' },

  { method: 'GET|POST', path: '/api/v1/backups', scope: 'backup:*' },
  { method: 'GET|DELETE', path: '/api/v1/backups/:id', scope: 'backup:*' },
  { method: 'POST', path: '/api/v1/backups/:id/restore', scope: 'backup:write + X-Confirm-Action: restore-backup' },

  { method: 'GET', path: '/api/v1/reports/dashboard', scope: 'reports:read' },
  { method: 'GET', path: '/api/v1/reports/net-worth', scope: 'reports:read' },
  { method: 'GET', path: '/api/v1/net-worth/snapshots', scope: 'reports:read' },
  { method: 'GET|POST', path: '/api/v1/retirement/forecast-settings', scope: 'reports:*' },
] as const;
