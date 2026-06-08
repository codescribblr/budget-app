import { createCrudHandlers } from '@/lib/external-api/resource-routes';

export const GET = createCrudHandlers('merchants', 'merchant_groups', 'account_id', {
  orderBy: 'name',
}).GET;

export const POST = createCrudHandlers('merchants', 'merchant_groups', 'account_id', {
  mapCreate: (body, context) => ({
    ...body,
    account_id: context.budgetAccountId,
    user_id: context.createdBy,
  }),
}).POST;
