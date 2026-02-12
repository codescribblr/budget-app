import { isAdmin } from '@/lib/admin';
import { AdminUsersList } from '@/components/admin/AdminUsersList';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required');
  }

  return <AdminUsersList />;
}
