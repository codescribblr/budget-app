import { createIdCrudHandlers } from '@/lib/external-api/resource-routes';

const handlers = createIdCrudHandlers('pending_checks', 'pending_checks', 'account_id');

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
