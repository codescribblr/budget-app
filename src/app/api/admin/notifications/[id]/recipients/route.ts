import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getAdminNotificationRecipients } from '@/lib/admin-notifications';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/notifications/[id]/recipients
 * Get recipients for an admin notification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const notificationId = parseInt(id);

    if (isNaN(notificationId)) {
      return NextResponse.json(
        { error: 'Invalid notification ID' },
        { status: 400 }
      );
    }

    const recipients = await getAdminNotificationRecipients(notificationId);

    // Enrich with user emails and account names
    const supabase = createServiceRoleClient();
    const enrichedRecipients = await Promise.all(
      recipients.map(async (recipient) => {
        // Get user email
        let userEmail = 'Unknown';
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(recipient.userId);
          userEmail = userData?.user?.email || 'Unknown';
        } catch (error) {
          console.error(`Error fetching user ${recipient.userId}:`, error);
        }

        // Get account name if applicable
        let accountName: string | null = null;
        if (recipient.budgetAccountId) {
          const { data: account } = await supabase
            .from('budget_accounts')
            .select('name')
            .eq('id', recipient.budgetAccountId)
            .single();
          accountName = account?.name || null;
        }

        return {
          ...recipient,
          userEmail,
          accountName,
        };
      })
    );

    return NextResponse.json({ recipients: enrichedRecipients });
  } catch (error: any) {
    console.error('Error fetching recipients:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch recipients' },
      { status: 500 }
    );
  }
}
