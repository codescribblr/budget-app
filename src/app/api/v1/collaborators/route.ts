import { NextResponse } from 'next/server';
import { withExternalApi, externalApiData } from '@/lib/external-api/handler';
import { getExternalDb } from '@/lib/external-api/query-helpers';

export const GET = withExternalApi('collaborators', async (_request, context) => {
  const supabase = getExternalDb();

  const [{ data: account, error: accountError }, { data: members, error: membersError }, { data: invitations, error: invitationsError }] =
    await Promise.all([
      supabase.from('budget_accounts').select('id, name, owner_id, created_at').eq('id', context.budgetAccountId).single(),
      supabase
        .from('account_users')
        .select('user_id, role, status, accepted_at, created_at')
        .eq('account_id', context.budgetAccountId)
        .eq('status', 'active')
        .order('created_at', { ascending: true }),
      supabase
        .from('account_invitations')
        .select('id, email, role, invited_by, expires_at, created_at')
        .eq('account_id', context.budgetAccountId)
        .is('accepted_at', null),
    ]);

  if (accountError) throw accountError;
  if (membersError) throw membersError;
  if (invitationsError) throw invitationsError;

  return NextResponse.json(
    externalApiData(
      {
        account,
        members: members ?? [],
        invitations: invitations ?? [],
      },
      context
    )
  );
});
