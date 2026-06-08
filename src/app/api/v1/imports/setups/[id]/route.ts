import { createIdCrudHandlers } from '@/lib/external-api/resource-routes';

const handlers = createIdCrudHandlers('imports', 'automatic_import_setups', 'account_id');

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
