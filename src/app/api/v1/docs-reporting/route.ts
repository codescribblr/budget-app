import { NextResponse } from 'next/server';
import { renderOpenApiDocsPage } from '@/lib/external-api/openapi/generate-spec';
import { APP_NAME } from '@/lib/branding';

/**
 * GET /api/v1/docs-reporting
 * Interactive docs for the 30-operation reporting API subset
 */
export async function GET() {
  const html = renderOpenApiDocsPage(
    '/api/v1/openapi-reporting.json',
    `${APP_NAME} Reporting API`,
    'Read-only API documentation for budget reporting — optimized for AI assistants.'
  );

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
