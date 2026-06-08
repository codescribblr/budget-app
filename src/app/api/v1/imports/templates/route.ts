import { createCrudHandlers } from '@/lib/external-api/resource-routes';

export const GET = createCrudHandlers('imports', 'csv_import_templates', 'account_id', {
  orderBy: 'name',
}).GET;

export const POST = createCrudHandlers('imports', 'csv_import_templates', 'account_id', {
  mapCreate: (body, context) => ({
    ...body,
    account_id: context.budgetAccountId,
    user_id: context.createdBy,
  }),
}).POST;
