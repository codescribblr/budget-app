import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkOwnerAccess } from '@/lib/api-helpers';

/**
 * GET /api/settings/api-keys/[id]/logs
 * Recent usage logs for an API key (owner only)
 */
export async function GET(
  request: NextRequest,
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

    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(request.nextUrl.searchParams.get('pageSize') ?? '25', 10) || 25)
    );
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { supabase } = await getAuthenticatedUser();

    const { data: key, error: keyError } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix')
      .eq('id', id)
      .eq('budget_account_id', accountId)
      .maybeSingle();

    if (keyError) throw keyError;
    if (!key) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const { data: logs, error: logsError, count } = await supabase
      .from('api_key_usage_log')
      .select('id, method, path, scope_used, status_code, ip_address, user_agent, created_at', {
        count: 'exact',
      })
      .eq('api_key_id', id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (logsError) throw logsError;

    return NextResponse.json({
      key,
      logs: logs ?? [],
      meta: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: count ? Math.ceil(count / pageSize) : 0,
      },
    });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching API key usage logs:', error);
    return NextResponse.json({ error: 'Failed to fetch usage logs' }, { status: 500 });
  }
}
