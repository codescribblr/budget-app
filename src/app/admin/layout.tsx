import { AdminLayout } from "@/components/layout/admin-layout"
import { isAdmin } from "@/lib/admin"

export default async function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  // Ensure user is admin - this will throw if not admin
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required');
  }

  return <AdminLayout>{children}</AdminLayout>
}
