import { createCrudHandlers } from '@/lib/external-api/resource-routes';
import { ExternalApiValidationError } from '@/lib/external-api/query-helpers';

const handlers = createCrudHandlers('non_cash_assets', 'non_cash_assets', 'account_id', {
  orderBy: 'name',
  validateCreate: (body) => {
    if (!body.name || body.asset_type === undefined) {
      throw new ExternalApiValidationError('name and asset_type are required');
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
