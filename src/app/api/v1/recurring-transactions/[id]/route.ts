import { createIdCrudHandlers } from '@/lib/external-api/resource-routes';

const handlers = createIdCrudHandlers('recurring_transactions', 'recurring_transactions', 'budget_account_id');

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
