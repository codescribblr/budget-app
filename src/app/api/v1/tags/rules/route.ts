import { createCrudHandlers } from '@/lib/external-api/resource-routes';

export const GET = createCrudHandlers('tags', 'tag_rules', 'account_id').GET;
export const POST = createCrudHandlers('tags', 'tag_rules', 'account_id', {
  mapCreate: (body, context) => ({
    ...body,
    account_id: context.budgetAccountId,
    user_id: context.createdBy,
  }),
}).POST;
