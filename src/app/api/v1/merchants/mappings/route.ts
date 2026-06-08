import { createCrudHandlers } from '@/lib/external-api/resource-routes';

export const GET = createCrudHandlers('merchants', 'merchant_mappings', 'account_id').GET;
export const POST = createCrudHandlers('merchants', 'merchant_mappings', 'account_id', {
  mapCreate: (body, context) => ({
    ...body,
    account_id: context.budgetAccountId,
    user_id: context.createdBy,
  }),
}).POST;
