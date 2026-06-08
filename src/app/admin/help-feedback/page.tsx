import { isAdmin } from '@/lib/admin';
import { AdminHelpFeedbackPage } from '@/components/admin/AdminHelpFeedbackPage';

export const dynamic = 'force-dynamic';

export default async function AdminHelpFeedbackPageWrapper() {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required');
  }

  return <AdminHelpFeedbackPage />;
}
