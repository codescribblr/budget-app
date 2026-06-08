import { AdminMerchantRecommendationsPage } from "@/components/admin/AdminMerchantRecommendationsPage"
import { isAdmin } from "@/lib/admin"

export const dynamic = 'force-dynamic'

export default async function AdminMerchantRecommendationsPageRoute() {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required');
  }

  return <AdminMerchantRecommendationsPage />
}
