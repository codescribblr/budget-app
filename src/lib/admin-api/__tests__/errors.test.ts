import { describe, expect, it } from 'vitest';
import { AdminApiError, adminApiErrorResponse } from '../errors';

describe('AdminApiError', () => {
  it('includes details such as existing_id on conflict responses', async () => {
    const error = new AdminApiError(409, 'conflict', 'A merchant with this name already exists', {
      existing_id: 42,
    });
    const response = adminApiErrorResponse(error);
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe('conflict');
    expect(body.error.existing_id).toBe(42);
    expect(body.error.message).toContain('already exists');
  });
});
