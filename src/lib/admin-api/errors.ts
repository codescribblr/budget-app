import { NextResponse } from 'next/server';

export class AdminApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export function adminApiErrorResponse(error: unknown): NextResponse {
  if (error instanceof AdminApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status }
    );
  }
  if (error instanceof Error && error.message === 'Unauthorized: Admin access required') {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Admin access required' } },
      { status: 401 }
    );
  }
  if (error instanceof Error && error.message === 'Unauthorized') {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Unauthorized' } },
      { status: 401 }
    );
  }
  console.error('[admin-api]', error);
  return NextResponse.json(
    { error: { code: 'internal_error', message: 'Internal server error' } },
    { status: 500 }
  );
}
