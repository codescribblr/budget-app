import { EXTERNAL_API_ENDPOINTS } from '../endpoints';
import { API_SCOPE_SECTIONS, ALL_API_SCOPES } from '../scopes';
import { OPENAPI_COMPONENT_SCHEMAS } from './schemas';
import { resolveOperationResponses } from './response-registry';
import { resolveOperationRequestBody } from './request-body-registry';
import {
  REPORTING_API_OPERATIONS,
  REPORTING_API_OPERATION_COUNT,
} from './reporting-endpoints';
import {
  EXTERNAL_API_RATE_LIMIT_PER_DAY,
  EXTERNAL_API_RATE_LIMIT_PER_MINUTE,
  IDEMPOTENCY_HEADER,
} from '../constants';
import { APP_NAME } from '@/lib/branding';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type OpenApiEndpointEntry = {
  method: string;
  path: string;
  scope: string;
};

export type GenerateOpenApiSpecOptions = {
  endpoints?: ReadonlyArray<OpenApiEndpointEntry>;
  title?: string;
  version?: string;
  descriptionLines?: string[];
};

interface OperationDetail {
  summary?: string;
  description?: string;
  parameters?: Array<Record<string, unknown>>;
  requestBody?: Record<string, unknown>;
}

/** Extra metadata keyed by "METHOD /api/v1/path" (OpenAPI path with {id} placeholders). */
const OPERATION_DETAILS: Record<string, OperationDetail> = {
  'GET /api/v1/me': {
    summary: 'Get API key metadata',
    description:
      'Returns the authenticated key name, granted scopes, available scope sections, and the full endpoint catalog.',
  },
  'GET /api/v1/export': {
    summary: 'Export account data',
    description:
      'Returns a full or partial account export (same shape as backups). Use the sections query param to limit output to scopes your key can read.',
    parameters: [
      {
        name: 'sections',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Comma-separated scope sections, e.g. transactions,categories,accounts',
      },
    ],
  },
  'GET /api/v1/transactions': {
    summary: 'List transactions',
    parameters: [
      { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
      { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
      { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
      { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
      { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search description or merchant' },
    ],
  },
  'GET /api/v1/dashboard': {
    summary: 'Dashboard summary',
    description: 'High-level budget totals: cash, envelopes, credit cards, pending checks, savings, and income.',
  },
  'GET /api/v1/reports/dashboard': {
    summary: 'Reports dashboard summary',
    description: 'Aggregate counts and balances for accounts, credit cards, categories, and recent activity.',
  },
  'GET /api/v1/reports/net-worth': {
    summary: 'Net worth report',
    description: 'Current net worth breakdown and optional 30-day change from snapshots.',
  },
  'GET /api/v1/net-worth/snapshots': {
    summary: 'List net worth snapshots',
    description: 'Historical net worth snapshots for trend analysis.',
  },
  'GET /api/v1/categories/monthly-funding': {
    summary: 'Category monthly funding',
    parameters: [
      { name: 'month', in: 'query', schema: { type: 'string' }, description: 'YYYY-MM' },
    ],
  },
  'GET /api/v1/goals/{id}/progress': {
    summary: 'Goal progress',
    description: 'Progress metrics for a savings or debt payoff goal.',
  },
  'GET /api/v1/income-buffer/status': {
    summary: 'Income buffer status',
    description: 'Current buffer balance, monthly budget, and runway months.',
  },
  'POST /api/v1/transactions': {
    summary: 'Create a transaction',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CreateTransactionRequest' },
        },
      },
    },
  },
  'GET /api/v1/transactions/search': {
    summary: 'Search transactions',
    parameters: [
      { name: 'q', in: 'query', required: true, schema: { type: 'string', minLength: 3 } },
      { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
    ],
  },
  'POST /api/v1/backups/{id}/restore': {
    summary: 'Restore a backup',
    description:
      'Destructive operation: replaces all account data with the backup. Requires the X-Confirm-Action: restore-backup header.',
    parameters: [
      {
        name: 'X-Confirm-Action',
        in: 'header',
        required: true,
        schema: { type: 'string', enum: ['restore-backup'] },
      },
    ],
  },
  'POST /api/v1/income-buffer/add': {
    summary: 'Add funds to income buffer',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['amount'],
            properties: { amount: { type: 'number', minimum: 0, exclusiveMinimum: true } },
          },
        },
      },
    },
  },
  'POST /api/v1/income-buffer/fund-month': {
    summary: 'Withdraw funds from income buffer',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['amount'],
            properties: { amount: { type: 'number', minimum: 0, exclusiveMinimum: true } },
          },
        },
      },
    },
  },
  'POST /api/v1/allocations/manual': {
    summary: 'Manually allocate funds to a category',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['categoryId', 'amount'],
            properties: {
              categoryId: { type: 'integer' },
              amount: { type: 'number', minimum: 0, exclusiveMinimum: true },
              month: { type: 'string', description: 'YYYY-MM-01 format; defaults to current month' },
            },
          },
        },
      },
    },
  },
  'PATCH /api/v1/categories/reorder': {
    summary: 'Reorder categories',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['categoryOrders'],
            properties: {
              categoryOrders: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'sort_order'],
                  properties: {
                    id: { type: 'integer' },
                    sort_order: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  'POST /api/v1/recurring-transactions/detect': {
    summary: 'Detect recurring transaction patterns',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: { lookbackMonths: { type: 'integer', default: 24 } },
          },
        },
      },
    },
  },
};

function toOpenApiPath(path: string): string {
  return path.replace(/:([a-zA-Z_]+)/g, '{$1}');
}

function inferTag(path: string): string {
  const segments = path.replace('/api/v1/', '').split('/');
  const first = segments[0];
  const tagMap: Record<string, string> = {
    me: 'Meta',
    export: 'Backup',
    dashboard: 'Reports',
    features: 'Settings',
    categories: 'Categories',
    accounts: 'Accounts',
    'credit-cards': 'Credit Cards',
    transactions: 'Transactions',
    goals: 'Goals',
    loans: 'Loans',
    'non-cash-assets': 'Non-cash Assets',
    'pending-checks': 'Pending Checks',
    'recurring-transactions': 'Recurring Transactions',
    income: 'Income',
    'income-buffer': 'Income Buffer',
    tags: 'Tags',
    merchants: 'Merchants',
    imports: 'Imports',
    settings: 'Settings',
    notifications: 'Notifications',
    collaborators: 'Collaborators',
    backups: 'Backup',
    reports: 'Reports',
    'net-worth': 'Reports',
    retirement: 'Retirement',
    allocations: 'Categories',
  };
  return tagMap[first] ?? first;
}

function parseScopeRequirement(scope: string): string {
  if (scope === 'any valid key') {
    return 'Any valid premium API key.';
  }
  return `Required scope: \`${scope}\`. Write implies read for the same section.`;
}

function capitalizeWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function pathSegmentToPascal(segment: string): string {
  if (segment.startsWith('{') && segment.endsWith('}')) {
    const param = segment.slice(1, -1).replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    return `By${capitalizeWord(param)}`;
  }

  return segment.split('-').map(capitalizeWord).join('');
}

/** Stable operationId required by ChatGPT Actions and other strict OpenAPI clients. */
export function toOperationId(method: HttpMethod, openApiPath: string): string {
  const relativePath = openApiPath.replace(/^\/api\/v1\/?/, '');
  const resource = relativePath
    .split('/')
    .filter(Boolean)
    .map(pathSegmentToPascal)
    .join('');
  return `${method}${resource}`;
}

/**
 * ChatGPT Actions rejects object schemas without a `properties` key.
 * Recursively adds `properties: {}` where missing.
 */
export function sanitizeOpenApiSpec<T extends Record<string, unknown>>(spec: T): T {
  return sanitizeOpenApiValue(spec) as T;
}

function sanitizeOpenApiValue(value: unknown): unknown {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeOpenApiValue);
  }

  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, nested] of Object.entries(obj)) {
    result[key] = sanitizeOpenApiValue(nested);
  }

  if (result.type === 'object' && !('properties' in result)) {
    result.properties = {};
  }

  return result;
}

function buildPaths(endpoints: ReadonlyArray<OpenApiEndpointEntry>): Record<string, Record<string, unknown>> {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const entry of endpoints) {
    const openApiPath = toOpenApiPath(entry.path);
    const methods = entry.method.toLowerCase().split('|') as HttpMethod[];

    if (!paths[openApiPath]) {
      paths[openApiPath] = {};
    }

    for (const method of methods) {
      const detailKey = `${method.toUpperCase()} ${openApiPath}`;
      const details = OPERATION_DETAILS[detailKey] ?? {};
      const requestBody =
        resolveOperationRequestBody(method, openApiPath) ?? details.requestBody;

      paths[openApiPath][method] = {
        operationId: toOperationId(method, openApiPath),
        tags: [inferTag(entry.path)],
        summary: details.summary ?? `${method.toUpperCase()} ${openApiPath}`,
        description: [details.description, parseScopeRequirement(entry.scope)].filter(Boolean).join('\n\n'),
        security: [{ BearerAuth: [] }],
        parameters: [
          ...(openApiPath.includes('{id}')
            ? [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'integer' },
                },
              ]
            : []),
          ...(details.parameters ?? []),
        ],
        ...(requestBody ? { requestBody } : {}),
        responses: resolveOperationResponses(method, openApiPath),
      };
    }
  }

  return paths;
}

function buildOpenApiComponents() {
  return {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description:
          'API key created in Settings → API Keys. Format: bud_test_... (dev) or bud_live_... (production).',
      },
    },
    schemas: {
      ...OPENAPI_COMPONENT_SCHEMAS,
      ApiScope: {
        type: 'string',
        enum: ALL_API_SCOPES,
      },
    },
    responses: {
      InvalidApiKey: {
        description: 'Missing or invalid API key',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
      },
      Forbidden: {
        description: 'Premium required or insufficient scope',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
      },
      ValidationError: {
        description: 'Invalid request parameters or body',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
      },
      NotFound: {
        description: 'Resource not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
      },
      InternalError: {
        description: 'Unexpected server error',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
      },
      RateLimitExceeded: {
        description: 'Rate limit exceeded',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
      },
    },
  };
}

function buildFullDescriptionLines(): string[] {
  const scopeDocs = API_SCOPE_SECTIONS.map(
    (s) => `- **${s.section}**: ${s.description} (\`${s.section}:read\`, \`${s.section}:write\`)`
  ).join('\n');

  return [
    'REST API for programmatic access to budget account data via scoped API keys.',
    '',
    '## Authentication',
    'Send your API key as a Bearer token:',
    '```',
    'Authorization: Bearer bud_test_...',
    '```',
    '',
    'Keys are created in **Settings → API Keys** (premium account owners only).',
    'Development keys use the `bud_test_` prefix; production keys use `bud_live_`.',
    '',
    '## Permissions',
    'Each key has granular read/write scopes per section:',
    scopeDocs,
    '',
    '## Response format',
    'Successful responses wrap payloads in a standard envelope:',
    '```json',
    '{ "data": { ... }, "meta": { "account_id": 1, "api_key_id": "..." } }',
    '```',
    'List endpoints that paginate also include `page`, `pageSize`, `total`, and `totalPages` in `meta`.',
    'Each operation documents the exact `data` schema returned.',
    '',
    '## Premium',
    'External API access requires an active premium subscription. If premium lapses, existing keys remain visible but all API requests return `403 premium_required`.',
    '',
    '## Rate limits',
    `Default limits per API key: ${EXTERNAL_API_RATE_LIMIT_PER_MINUTE} requests/minute and ${EXTERNAL_API_RATE_LIMIT_PER_DAY} requests/day. Exceeded limits return \`429 rate_limit_exceeded\` with a \`Retry-After\` header.`,
    '',
    '## Idempotency',
    `Send \`${IDEMPOTENCY_HEADER}\` on POST, PUT, and PATCH requests to safely retry writes. Replays within 24 hours return the original response.`,
    '',
    '## Errors',
    'All error responses use `{ "error": { "code", "message", ... } }`.',
    '',
    '## Related specs',
    '- Reporting subset (30 read operations for AI tools): `/api/v1/openapi-reporting.json`',
  ];
}

function buildReportingDescriptionLines(): string[] {
  return [
    `Read-only subset of the ${APP_NAME} API with exactly ${REPORTING_API_OPERATION_COUNT} GET operations for budget reporting and AI assistants.`,
    '',
    'Use this spec when your tool limits OpenAPI operation count (e.g. ChatGPT custom actions).',
    'The full API including writes is at `/api/v1/openapi.json`.',
    '',
    '## Authentication',
    'Send your API key as a Bearer token:',
    '```',
    'Authorization: Bearer bud_live_...',
    '```',
    '',
    'Create keys in **Settings → API Keys** with read scopes for the sections you need.',
    'The **Read-only assistant** preset covers most endpoints in this spec.',
    '',
    '## Response format',
    '```json',
    '{ "data": { ... }, "meta": { "account_id": 1, "api_key_id": "..." } }',
    '```',
    '',
    '## Typical workflow',
    '1. `GET /me` — verify key and scopes',
    '2. `GET /dashboard` or `GET /reports/net-worth` — overview',
    '3. `GET /categories`, `GET /accounts`, `GET /transactions` — detail',
    '4. `GET /export?sections=...` — bulk export when needed',
    '',
    '## Rate limits',
    `Default limits per API key: ${EXTERNAL_API_RATE_LIMIT_PER_MINUTE} requests/minute and ${EXTERNAL_API_RATE_LIMIT_PER_DAY} requests/day.`,
    '',
    '## Full API',
    '- OpenAPI: `/api/v1/openapi.json`',
    '- Interactive docs: `/api/v1/docs`',
  ];
}

export function generateOpenApiSpec(baseUrl: string, options: GenerateOpenApiSpecOptions = {}) {
  const endpoints = options.endpoints ?? EXTERNAL_API_ENDPOINTS;
  const descriptionLines = options.descriptionLines ?? buildFullDescriptionLines();

  return sanitizeOpenApiSpec({
    openapi: '3.1.0',
    info: {
      title: options.title ?? `${APP_NAME} External API`,
      version: options.version ?? '1.0.0',
      description: descriptionLines.join('\n'),
      contact: {
        name: `${APP_NAME} Support`,
      },
    },
    servers: [{ url: baseUrl, description: 'Current environment' }],
    tags: [...new Set(endpoints.map((e) => inferTag(e.path)))].sort().map((name) => ({ name })),
    paths: buildPaths(endpoints),
    components: buildOpenApiComponents(),
  });
}

export function generateReportingOpenApiSpec(baseUrl: string) {
  return generateOpenApiSpec(baseUrl, {
    endpoints: REPORTING_API_OPERATIONS,
    title: `${APP_NAME} Reporting API`,
    version: '1.0.0-reporting',
    descriptionLines: buildReportingDescriptionLines(),
  });
}

export function renderOpenApiDocsPage(specUrl: string, title: string, description: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <style>body { margin: 0; }</style>
</head>
<body>
  <script id="api-reference" data-url="${specUrl}"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.25.91/dist/browser/standalone.js"></script>
</body>
</html>`;
}

export function getOpenApiBaseUrl(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  const url = new URL(request.url);
  return url.origin;
}
