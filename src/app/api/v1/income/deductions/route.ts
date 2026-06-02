import { createCrudHandlers } from '@/lib/external-api/resource-routes';

const handlers = createCrudHandlers('income', 'pre_tax_deductions', 'account_id', {
  orderBy: 'name',
  mapCreate: (body, context) => ({
    ...body,
    account_id: context.budgetAccountId,
    user_id: context.createdBy,
  }),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
