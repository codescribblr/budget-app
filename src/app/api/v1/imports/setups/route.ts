import { createCrudHandlers } from '@/lib/external-api/resource-routes';

export const GET = createCrudHandlers('imports', 'automatic_import_setups', 'account_id', {
  orderBy: 'created_at',
  ascending: false,
}).GET;

export const POST = createCrudHandlers('imports', 'automatic_import_setups', 'account_id', {
  mapCreate: (body, context) => ({
    ...body,
    account_id: context.budgetAccountId,
    user_id: context.createdBy,
  }),
}).POST;
