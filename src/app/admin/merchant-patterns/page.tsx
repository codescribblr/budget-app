import { AdminMerchantPatternsPage } from "@/components/admin/AdminMerchantPatternsPage"
import { isAdmin } from "@/lib/admin"

export const dynamic = 'force-dynamic'

export default async function AdminMerchantPatternsPageRoute() {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required');
  }

  return <AdminMerchantPatternsPage />
}
