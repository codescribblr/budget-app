import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NotificationDetail } from '@/components/notifications/NotificationDetail';

export default async function NotificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await getAuthenticatedUser();
  const { id } = await params;
  const notificationId = parseInt(id);

  if (isNaN(notificationId)) {
    redirect('/notifications');
  }

  const supabase = await createClient();
  const { data: notification, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', notificationId)
    .eq('user_id', user.id)
    .single();

  if (error || !notification) {
    redirect('/notifications');
  }

  // Mark as read if not already read
  if (!notification.is_read) {
    await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);
  }

  return <NotificationDetail notification={notification} />;
}
