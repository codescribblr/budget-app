import { isAdmin } from '@/lib/admin';
import { AdminUserDetailView } from '@/components/admin/AdminUserDetailView';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required');
  }

  const { id } = await params;
  if (!id) notFound();

  return <AdminUserDetailView userId={id} />;
}
