import { NextResponse } from 'next/server';
import { renderOpenApiDocsPage } from '@/lib/external-api/openapi/generate-spec';
import { APP_NAME } from '@/lib/branding';

/**
 * GET /api/v1/docs
 * Interactive API documentation powered by Scalar (reads /api/v1/openapi.json)
 */
export async function GET() {
  const html = renderOpenApiDocsPage(
    '/api/v1/openapi.json',
    `${APP_NAME} API Documentation`,
    `External API documentation for ${APP_NAME} — scoped API keys for AI and third-party integrations.`
  );

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
