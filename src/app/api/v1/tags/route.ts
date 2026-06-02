import { createCrudHandlers } from '@/lib/external-api/resource-routes';
import { ExternalApiValidationError } from '@/lib/external-api/query-helpers';

const handlers = createCrudHandlers('tags', 'tags', 'account_id', {
  orderBy: 'name',
  validateCreate: (body) => {
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      throw new ExternalApiValidationError('Tag name is required');
    }
  },
  mapCreate: (body, context) => ({
    name: (body.name as string).trim(),
    color: body.color ?? null,
    description: body.description ?? null,
    account_id: context.budgetAccountId,
    user_id: context.createdBy,
  }),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
