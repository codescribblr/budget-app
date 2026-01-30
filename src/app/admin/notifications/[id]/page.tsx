import { isAdmin } from '@/lib/admin';
import { AdminNotificationDetail } from '@/components/admin/AdminNotificationDetail';

export default async function AdminNotificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required');
  }

  const { id } = await params;
  return <AdminNotificationDetail notificationId={parseInt(id)} />;
}
