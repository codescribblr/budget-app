import { NextResponse } from 'next/server';
import { withExternalApiService, externalApiData } from '@/lib/external-api/handler';
import { detectRecurringTransactions } from '@/lib/recurring-transactions/detection';
import { saveDetectedPatterns } from '@/lib/recurring-transactions/save-patterns';

export const POST = withExternalApiService('recurring_transactions', async (request, context) => {
  const body = await request.json().catch(() => ({}));
  const lookbackMonths = body.lookbackMonths ?? 24;

  const patterns = await detectRecurringTransactions(
    context.createdBy,
    context.budgetAccountId,
    lookbackMonths
  );

  if (patterns.length === 0) {
    return NextResponse.json(
      externalApiData(
        { patterns: [], saved: 0, skipped: 0, errors: 0, message: 'No recurring patterns found' },
        context
      )
    );
  }

  const sendNotifications = body.sendNotifications === true;

  const result = await saveDetectedPatterns(context.createdBy, context.budgetAccountId, patterns, {
    sendNewPatternNotifications: sendNotifications,
  });
  return NextResponse.json(
    externalApiData(
      {
        patterns,
        ...result,
        message: `Found ${patterns.length} patterns. ${result.saved} saved, ${result.skipped} skipped, ${result.errors} errors`,
      },
      context
    )
  );
});
