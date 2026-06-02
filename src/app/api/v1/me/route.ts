import { NextResponse } from 'next/server';
import { withExternalApiAuth, externalApiData } from '@/lib/external-api/handler';
import { ALL_API_SCOPES, API_SCOPE_SECTIONS } from '@/lib/external-api/scopes';
import { EXTERNAL_API_ENDPOINTS } from '@/lib/external-api/endpoints';

/**
 * GET /api/v1/me
 * Returns API key metadata and granted scopes
 */
export const GET = withExternalApiAuth(async (_request, context) => {
  return NextResponse.json(
    externalApiData(
      {
        key_name: context.keyName,
        permissions: context.permissions,
        available_sections: API_SCOPE_SECTIONS,
        all_scopes: ALL_API_SCOPES,
        endpoints: EXTERNAL_API_ENDPOINTS,
        documentation: {
          openapi: '/api/v1/openapi.json',
          interactive: '/api/v1/docs',
        },
      },
      context
    )
  );
});
