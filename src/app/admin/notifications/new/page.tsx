import { isAdmin } from '@/lib/admin';
import { AdminNotificationForm } from '@/components/admin/AdminNotificationForm';

export default async function NewAdminNotificationPage() {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required');
  }

  return <AdminNotificationForm />;
}
