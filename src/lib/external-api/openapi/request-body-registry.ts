type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

const jsonBody = (schemaRef: string, required = true) => ({
  required,
  content: {
    'application/json': {
      schema: { $ref: schemaRef },
    },
  },
});

/** Request bodies keyed by "METHOD /api/v1/openapi/path". */
export const REQUEST_BODY_REGISTRY: Record<string, Record<string, unknown>> = {
  'POST /api/v1/categories': jsonBody('#/components/schemas/CreateCategoryRequest'),
  'PATCH /api/v1/categories/{id}': jsonBody('#/components/schemas/UpdateCategoryRequest'),
  'PATCH /api/v1/categories/reorder': jsonBody('#/components/schemas/ReorderCategoriesRequest'),
  'PATCH /api/v1/categories/bulk-archive': jsonBody('#/components/schemas/BulkArchiveCategoriesRequest'),
  'POST /api/v1/allocations/manual': jsonBody('#/components/schemas/ManualAllocationRequest'),

  'POST /api/v1/accounts': jsonBody('#/components/schemas/CreateAccountRequest'),
  'PATCH /api/v1/accounts/{id}': jsonBody('#/components/schemas/UpdateAccountRequest'),

  'POST /api/v1/credit-cards': jsonBody('#/components/schemas/CreateCreditCardRequest'),
  'PATCH /api/v1/credit-cards/{id}': jsonBody('#/components/schemas/UpdateCreditCardRequest'),

  'POST /api/v1/transactions': jsonBody('#/components/schemas/CreateTransactionRequest'),
  'PATCH /api/v1/transactions/{id}': jsonBody('#/components/schemas/UpdateTransactionRequest'),

  'POST /api/v1/goals': jsonBody('#/components/schemas/CreateGoalRequest'),
  'PATCH /api/v1/goals/{id}': jsonBody('#/components/schemas/UpdateGoalRequest'),

  'POST /api/v1/loans': jsonBody('#/components/schemas/CreateLoanRequest'),
  'PATCH /api/v1/loans/{id}': jsonBody('#/components/schemas/UpdateLoanRequest'),

  'POST /api/v1/non-cash-assets': jsonBody('#/components/schemas/CreateNonCashAssetRequest'),
  'PATCH /api/v1/non-cash-assets/{id}': jsonBody('#/components/schemas/UpdateNonCashAssetRequest'),

  'POST /api/v1/pending-checks': jsonBody('#/components/schemas/CreatePendingCheckRequest'),
  'PATCH /api/v1/pending-checks/{id}': jsonBody('#/components/schemas/UpdatePendingCheckRequest'),

  'POST /api/v1/recurring-transactions': jsonBody('#/components/schemas/CreateRecurringTransactionRequest'),
  'PATCH /api/v1/recurring-transactions/{id}': jsonBody('#/components/schemas/UpdateRecurringTransactionRequest'),
  'POST /api/v1/recurring-transactions/detect': jsonBody('#/components/schemas/DetectRecurringTransactionsRequest', false),

  'POST /api/v1/income/streams': jsonBody('#/components/schemas/CreateIncomeStreamRequest'),
  'PATCH /api/v1/income/streams/{id}': jsonBody('#/components/schemas/UpdateIncomeStreamRequest'),
  'POST /api/v1/income/settings': jsonBody('#/components/schemas/CreateIncomeSettingsRequest'),
  'POST /api/v1/income/deductions': jsonBody('#/components/schemas/CreatePreTaxDeductionRequest'),

  'POST /api/v1/income-buffer/add': jsonBody('#/components/schemas/IncomeBufferAmountRequest'),
  'POST /api/v1/income-buffer/fund-month': jsonBody('#/components/schemas/IncomeBufferAmountRequest'),

  'POST /api/v1/tags': jsonBody('#/components/schemas/CreateTagRequest'),
  'PATCH /api/v1/tags/{id}': jsonBody('#/components/schemas/UpdateTagRequest'),
  'POST /api/v1/tags/rules': jsonBody('#/components/schemas/CreateTagRuleRequest'),
  'POST /api/v1/tags/bulk-assign': jsonBody('#/components/schemas/BulkAssignTagsRequest'),

  'POST /api/v1/merchants/groups': jsonBody('#/components/schemas/CreateMerchantGroupRequest'),
  'PATCH /api/v1/merchants/groups/{id}': jsonBody('#/components/schemas/UpdateMerchantGroupRequest'),
  'POST /api/v1/merchants/mappings': jsonBody('#/components/schemas/CreateMerchantMappingRequest'),
  'POST /api/v1/merchants/category-rules': jsonBody('#/components/schemas/CreateMerchantCategoryRuleRequest'),
  'PATCH /api/v1/merchants/category-rules/{id}': jsonBody('#/components/schemas/UpdateMerchantCategoryRuleRequest'),

  'POST /api/v1/imports/templates': jsonBody('#/components/schemas/CreateCsvImportTemplateRequest'),
  'POST /api/v1/imports/setups': jsonBody('#/components/schemas/CreateAutomaticImportSetupRequest'),
  'PATCH /api/v1/imports/setups/{id}': jsonBody('#/components/schemas/UpdateAutomaticImportSetupRequest'),
  'PATCH /api/v1/imports/queue/{id}': jsonBody('#/components/schemas/UpdateQueuedImportRequest'),
  'POST /api/v1/imports/queue/approve-batch': jsonBody('#/components/schemas/ApproveBatchImportsRequest'),

  'POST /api/v1/settings': jsonBody('#/components/schemas/UpdateSettingsRequest'),
  'PATCH /api/v1/notifications/{id}': jsonBody('#/components/schemas/UpdateNotificationRequest'),
  'PATCH /api/v1/notifications/preferences': jsonBody('#/components/schemas/UpdateNotificationPreferencesRequest'),
  'POST /api/v1/retirement/forecast-settings': jsonBody('#/components/schemas/UpdateRetirementForecastSettingsRequest'),
};

export function resolveOperationRequestBody(
  method: HttpMethod,
  openApiPath: string
): Record<string, unknown> | undefined {
  const key = `${method.toUpperCase()} ${openApiPath}`;
  return REQUEST_BODY_REGISTRY[key];
}
