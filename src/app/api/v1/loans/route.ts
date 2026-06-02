import { createCrudHandlers } from '@/lib/external-api/resource-routes';
import { ExternalApiValidationError } from '@/lib/external-api/query-helpers';

const handlers = createCrudHandlers('loans', 'loans', 'account_id', {
  orderBy: 'name',
  validateCreate: (body) => {
    if (!body.name || body.balance === undefined) {
      throw new ExternalApiValidationError('name and balance are required');
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
