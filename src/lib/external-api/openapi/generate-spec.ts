import { EXTERNAL_API_ENDPOINTS } from '../endpoints';
import { API_SCOPE_SECTIONS, ALL_API_SCOPES } from '../scopes';
import { OPENAPI_COMPONENT_SCHEMAS } from './schemas';
import { resolveOperationResponses } from './response-registry';
import { resolveOperationRequestBody } from './request-body-registry';
import {
  EXTERNAL_API_RATE_LIMIT_PER_DAY,
  EXTERNAL_API_RATE_LIMIT_PER_MINUTE,
  IDEMPOTENCY_HEADER,
} from '../constants';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

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

function buildPaths(): Record<string, Record<string, unknown>> {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const entry of EXTERNAL_API_ENDPOINTS) {
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

export function generateOpenApiSpec(baseUrl: string) {
  const scopeDocs = API_SCOPE_SECTIONS.map(
    (s) => `- **${s.section}**: ${s.description} (\`${s.section}:read\`, \`${s.section}:write\`)`
  ).join('\n');

  return {
    openapi: '3.1.0',
    info: {
      title: 'Budget App External API',
      version: '1.0.0',
      description: [
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
      ].join('\n'),
      contact: {
        name: 'Budget App Support',
      },
    },
    servers: [{ url: baseUrl, description: 'Current environment' }],
    tags: [
      ...new Set(EXTERNAL_API_ENDPOINTS.map((e) => inferTag(e.path))),
    ].sort().map((name) => ({ name })),
    paths: buildPaths(),
    components: {
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
    },
  };
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
