import { createCrudHandlers } from '@/lib/external-api/resource-routes';
import { ExternalApiValidationError } from '@/lib/external-api/query-helpers';

const handlers = createCrudHandlers('pending_checks', 'pending_checks', 'account_id', {
  orderBy: 'date',
  ascending: false,
  validateCreate: (body) => {
    if (!body.payee || body.amount === undefined || !body.date) {
      throw new ExternalApiValidationError('payee, amount, and date are required');
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
