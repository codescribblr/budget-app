import { createCrudHandlers } from '@/lib/external-api/resource-routes';

const settingsHandlers = createCrudHandlers('income', 'income_settings', 'account_id', {
  mapCreate: (body, context) => ({
    ...body,
    account_id: context.budgetAccountId,
    user_id: context.createdBy,
  }),
});

export const GET = settingsHandlers.GET;
export const POST = settingsHandlers.POST;
