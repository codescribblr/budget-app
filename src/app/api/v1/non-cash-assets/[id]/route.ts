import { createIdCrudHandlers } from '@/lib/external-api/resource-routes';

const handlers = createIdCrudHandlers('non_cash_assets', 'non_cash_assets', 'account_id');

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
