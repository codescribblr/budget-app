import { AdminGlobalMerchantsPage } from "@/components/admin/AdminGlobalMerchantsPage"
import { isAdmin } from "@/lib/admin"

export default async function AdminMerchantsPage() {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required');
  }

  return <AdminGlobalMerchantsPage />
}
