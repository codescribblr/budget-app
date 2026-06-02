import { NextResponse } from 'next/server';
import { generateReportingOpenApiSpec, getOpenApiBaseUrl } from '@/lib/external-api/openapi/generate-spec';

/**
 * GET /api/v1/openapi-reporting.json
 * Read-only OpenAPI subset (30 operations) for AI tools with operation limits
 */
export async function GET(request: Request) {
  const baseUrl = getOpenApiBaseUrl(request);
  const spec = generateReportingOpenApiSpec(baseUrl);

  return NextResponse.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Content-Type': 'application/json',
    },
  });
}
