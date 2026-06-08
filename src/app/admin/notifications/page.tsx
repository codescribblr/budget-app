import { isAdmin } from '@/lib/admin';
import { AdminNotificationsList } from '@/components/admin/AdminNotificationsList';

export default async function AdminNotificationsPage() {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required');
  }

  return <AdminNotificationsList />;
}
