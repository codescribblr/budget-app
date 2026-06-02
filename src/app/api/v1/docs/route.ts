import { NextResponse } from 'next/server';

/**
 * GET /api/v1/docs
 * Interactive API documentation powered by Scalar (reads /api/v1/openapi.json)
 */
export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Budget App API Documentation</title>
  <meta name="description" content="External API documentation for Budget App — scoped API keys for AI and third-party integrations." />
  <style>body { margin: 0; }</style>
</head>
<body>
  <script id="api-reference" data-url="/api/v1/openapi.json"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.25.91/dist/browser/standalone.js"></script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
