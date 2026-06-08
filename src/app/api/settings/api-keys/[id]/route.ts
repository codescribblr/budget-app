import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkOwnerAccess } from '@/lib/api-helpers';

/**
 * DELETE /api/settings/api-keys/[id]
 * Revoke an API key (owner only, premium required)
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ownerCheck = await checkOwnerAccess();
    if (ownerCheck) return ownerCheck;

    const { id } = await params;
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { supabase } = await getAuthenticatedUser();
    const { data: existing, error: fetchError } = await supabase
      .from('api_keys')
      .select('id')
      .eq('id', id)
      .eq('budget_account_id', accountId)
      .is('revoked_at', null)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('api_keys')
      .update({
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('budget_account_id', accountId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error revoking API key:', error);
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
}
