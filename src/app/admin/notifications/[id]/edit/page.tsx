import { isAdmin } from '@/lib/admin';
import { AdminNotificationForm } from '@/components/admin/AdminNotificationForm';

export default async function EditAdminNotificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required');
  }

  const { id } = await params;
  return <AdminNotificationForm notificationId={parseInt(id)} />;
}
