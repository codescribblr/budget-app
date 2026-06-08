import { createCrudHandlers } from '@/lib/external-api/resource-routes';
import { ExternalApiValidationError } from '@/lib/external-api/query-helpers';

const handlers = createCrudHandlers('goals', 'goals', 'account_id', {
  orderBy: 'name',
  validateCreate: (body) => {
    if (!body.name || typeof body.name !== 'string') {
      throw new ExternalApiValidationError('name is required');
    }
  },
  mapCreate: (body, context) => ({
    ...body,
    account_id: context.budgetAccountId,
    user_id: context.createdBy,
  }),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
