import { NextResponse } from 'next/server';
import { generateOpenApiSpec, getOpenApiBaseUrl } from '@/lib/external-api/openapi/generate-spec';

/**
 * GET /api/v1/openapi.json
 * OpenAPI 3.1 specification (public)
 */
export async function GET(request: Request) {
  const baseUrl = getOpenApiBaseUrl(request);
  const spec = generateOpenApiSpec(baseUrl);

  return NextResponse.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Content-Type': 'application/json',
    },
  });
}
