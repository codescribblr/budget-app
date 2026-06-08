import { NextResponse } from 'next/server';
import { renderOpenApiDocsPage } from '@/lib/external-api/openapi/generate-spec';

/**
 * GET /api/v1/docs
 * Interactive API documentation powered by Scalar (reads /api/v1/openapi.json)
 */
export async function GET() {
  const html = renderOpenApiDocsPage(
    '/api/v1/openapi.json',
    'Budget App API Documentation',
    'External API documentation for Budget App — scoped API keys for AI and third-party integrations.'
  );

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
