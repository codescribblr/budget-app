type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

type ResponseSpec = {
  dataSchema: Record<string, unknown>;
  paginated?: boolean;
  successStatus?: 200 | 201;
};

const S = '#/components/schemas';

function ref(name: string): Record<string, unknown> {
  return { $ref: `${S}/${name}` };
}

function arrayOf(name: string): Record<string, unknown> {
  return { type: 'array', items: ref(name) };
}

function envelope(dataSchema: Record<string, unknown>, paginated = false): Record<string, unknown> {
  return {
    type: 'object',
    required: ['data', 'meta'],
    properties: {
      data: dataSchema,
      meta: ref(paginated ? 'PaginatedResponseMeta' : 'ResponseMeta'),
    },
  };
}

function successResponse(spec: ResponseSpec): Record<string, unknown> {
  const status = spec.successStatus ?? 200;
  return {
    [String(status)]: {
      description: status === 201 ? 'Created' : 'Success',
      content: {
        'application/json': {
          schema: envelope(spec.dataSchema, spec.paginated),
        },
      },
    },
  };
}

function errorResponses(): Record<string, unknown> {
  return {
    '400': { $ref: '#/components/responses/ValidationError' },
    '401': { $ref: '#/components/responses/InvalidApiKey' },
    '403': { $ref: '#/components/responses/Forbidden' },
    '404': { $ref: '#/components/responses/NotFound' },
    '429': { $ref: '#/components/responses/RateLimitExceeded' },
    '500': { $ref: '#/components/responses/InternalError' },
  };
}

/** CRUD resource paths mapped to entity schema names. */
const CRUD_RESOURCES: Record<string, string> = {
  '/categories': 'Category',
  '/accounts': 'Account',
  '/credit-cards': 'CreditCard',
  '/goals': 'Goal',
  '/loans': 'Loan',
  '/non-cash-assets': 'NonCashAsset',
  '/pending-checks': 'PendingCheck',
  '/recurring-transactions': 'RecurringTransaction',
  '/income/streams': 'IncomeStream',
  '/income/settings': 'IncomeSettings',
  '/income/deductions': 'PreTaxDeduction',
  '/tags': 'Tag',
  '/tags/rules': 'TagRule',
  '/merchants/groups': 'MerchantGroup',
  '/merchants/mappings': 'MerchantMapping',
  '/merchants/category-rules': 'MerchantCategoryRule',
  '/imports/templates': 'CsvImportTemplate',
  '/imports/setups': 'AutomaticImportSetup',
};

const CUSTOM_RESPONSES: Record<string, ResponseSpec> = {
  'GET /api/v1/me': { dataSchema: ref('MeResponse') },
  'GET /api/v1/export': { dataSchema: ref('AccountExportData') },
  'GET /api/v1/dashboard': { dataSchema: ref('DashboardSummary') },
  'GET /api/v1/features': { dataSchema: ref('FeaturesMap') },
  'GET /api/v1/categories/monthly-funding': { dataSchema: arrayOf('CategoryMonthlyFunding') },
  'PATCH /api/v1/categories/reorder': { dataSchema: ref('UpdatedCountResult') },
  'PATCH /api/v1/categories/bulk-archive': { dataSchema: arrayOf('Category') },
  'POST /api/v1/allocations/manual': { dataSchema: ref('ManualAllocationResult') },
  'GET /api/v1/accounts/{id}/balance-history': { dataSchema: arrayOf('BalanceAuditEntry') },
  'GET /api/v1/credit-cards/{id}/balance-history': { dataSchema: arrayOf('BalanceAuditEntry') },
  'GET /api/v1/transactions': { dataSchema: arrayOf('TransactionWithSplits'), paginated: true },
  'POST /api/v1/transactions': { dataSchema: ref('TransactionWithSplits'), successStatus: 201 },
  'GET /api/v1/transactions/{id}': { dataSchema: ref('TransactionWithSplits') },
  'PATCH /api/v1/transactions/{id}': { dataSchema: ref('TransactionWithSplits') },
  'DELETE /api/v1/transactions/{id}': { dataSchema: ref('SuccessResult') },
  'GET /api/v1/transactions/search': { dataSchema: arrayOf('TransactionWithSplits') },
  'GET /api/v1/transactions/duplicates': { dataSchema: ref('DuplicateGroupsResponse') },
  'GET /api/v1/goals/{id}/progress': { dataSchema: ref('GoalProgressResponse') },
  'POST /api/v1/recurring-transactions/detect': { dataSchema: ref('RecurringDetectResponse') },
  'GET /api/v1/income-buffer/status': { dataSchema: ref('IncomeBufferStatus') },
  'POST /api/v1/income-buffer/add': { dataSchema: ref('IncomeBufferMutationResult') },
  'POST /api/v1/income-buffer/fund-month': { dataSchema: ref('IncomeBufferMutationResult') },
  'POST /api/v1/tags/bulk-assign': { dataSchema: ref('BulkAssignResult') },
  'GET /api/v1/merchants/recommendations': { dataSchema: arrayOf('MerchantRecommendation') },
  'GET /api/v1/imports/queue': { dataSchema: arrayOf('QueuedImport'), paginated: true },
  'GET /api/v1/imports/queue/{id}': { dataSchema: ref('QueuedImport') },
  'PATCH /api/v1/imports/queue/{id}': { dataSchema: ref('QueuedImport') },
  'POST /api/v1/imports/queue/{id}/approve': { dataSchema: ref('ImportApproveResult') },
  'POST /api/v1/imports/queue/{id}/reject': { dataSchema: ref('SuccessResult') },
  'POST /api/v1/imports/queue/approve-batch': { dataSchema: ref('ImportApproveResult') },
  'GET /api/v1/settings': { dataSchema: ref('SettingsMap') },
  'POST /api/v1/settings': { dataSchema: ref('SuccessResult') },
  'GET /api/v1/notifications': { dataSchema: arrayOf('Notification'), paginated: true },
  'GET /api/v1/notifications/unread-count': { dataSchema: ref('UnreadCountResponse') },
  'GET /api/v1/notifications/preferences': { dataSchema: ref('NotificationPreferencesMap') },
  'PATCH /api/v1/notifications/preferences': { dataSchema: ref('SuccessResult') },
  'GET /api/v1/notifications/{id}': { dataSchema: ref('Notification') },
  'PATCH /api/v1/notifications/{id}': { dataSchema: ref('Notification') },
  'DELETE /api/v1/notifications/{id}': { dataSchema: ref('SuccessResult') },
  'GET /api/v1/collaborators': { dataSchema: ref('CollaboratorsResponse') },
  'GET /api/v1/backups': { dataSchema: ref('BackupsListResponse') },
  'POST /api/v1/backups': { dataSchema: ref('BackupCreatedResponse'), successStatus: 201 },
  'GET /api/v1/backups/{id}': { dataSchema: ref('AccountExportData') },
  'DELETE /api/v1/backups/{id}': { dataSchema: ref('SuccessResult') },
  'POST /api/v1/backups/{id}/restore': { dataSchema: ref('SuccessResult') },
  'GET /api/v1/reports/dashboard': { dataSchema: ref('ReportsDashboardSummary') },
  'GET /api/v1/reports/net-worth': { dataSchema: ref('NetWorthReport') },
  'GET /api/v1/net-worth/snapshots': { dataSchema: arrayOf('NetWorthSnapshot') },
  'GET /api/v1/retirement/forecast-settings': { dataSchema: ref('RetirementForecastSettings') },
  'POST /api/v1/retirement/forecast-settings': { dataSchema: ref('SuccessResult') },
};

function stripApiPrefix(openApiPath: string): string {
  return openApiPath.replace(/^\/api\/v1/, '') || '/';
}

function resolveCrudResponse(method: HttpMethod, openApiPath: string): ResponseSpec | null {
  const resourcePath = stripApiPrefix(openApiPath);
  const idMatch = resourcePath.match(/^(.+)\/\{id\}$/);

  if (idMatch) {
    const basePath = idMatch[1];
    const entity = CRUD_RESOURCES[basePath];
    if (!entity) return null;

    switch (method) {
      case 'get':
        return { dataSchema: ref(entity) };
      case 'patch':
        return { dataSchema: ref(entity) };
      case 'delete':
        return { dataSchema: ref('SuccessResult') };
      default:
        return null;
    }
  }

  const entity = CRUD_RESOURCES[resourcePath];
  if (!entity) return null;

  switch (method) {
    case 'get':
      return { dataSchema: arrayOf(entity) };
    case 'post':
      return { dataSchema: ref(entity), successStatus: 201 };
    default:
      return null;
  }
}

export function resolveOperationResponses(
  method: HttpMethod,
  openApiPath: string
): Record<string, unknown> {
  const key = `${method.toUpperCase()} ${openApiPath}`;
  const spec = CUSTOM_RESPONSES[key] ?? resolveCrudResponse(method, openApiPath);

  if (!spec) {
    return {
      '200': {
        description: 'Success',
        content: {
          'application/json': {
            schema: envelope({ type: 'object', additionalProperties: true }),
          },
        },
      },
      ...errorResponses(),
    };
  }

  return {
    ...successResponse(spec),
    ...errorResponses(),
  };
}
