import { NextResponse } from 'next/server';
import { withExternalApiService, externalApiData } from '@/lib/external-api/handler';
import { calculateGoalProgress } from '@/lib/goals/calculations';
import { getGoalById } from '@/lib/supabase-queries';
import { externalApiIdRoute } from '@/lib/external-api/resource-routes';
import { ExternalApiNotFoundError } from '@/lib/external-api/query-helpers';

export const GET = externalApiIdRoute('goals', async (_request, context, id) => {
  const goal = await getGoalById(id);
  if (!goal) throw new ExternalApiNotFoundError('Goal not found');

  const progress = calculateGoalProgress(goal, goal.current_balance || 0);
  return NextResponse.json(
    externalApiData(
      {
        goal: {
          id: goal.id,
          name: goal.name,
          target_amount: goal.target_amount,
          target_date: goal.target_date,
          monthly_contribution: goal.monthly_contribution,
          current_balance: goal.current_balance,
        },
        progress,
      },
      context
    )
  );
});
